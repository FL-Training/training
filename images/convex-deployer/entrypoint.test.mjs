import assert from "node:assert/strict";
import test from "node:test";

import {
  ReconciliationError,
  failureEvidence,
  parseAdminKey,
  readSecretFile,
  reconcile,
  validateRuntime,
  verifyBakedContract,
  waitForBackend,
} from "./entrypoint.mjs";

const SOURCE_REF = "a".repeat(40);
const RUNTIME = {
  EXPECTED_APPLICATION_SOURCE_REF: SOURCE_REF,
  EXPECTED_CONVEX_CLI_VERSION: "1.42.1",
  INSTANCE_NAME: "pacivis-site-dev",
  CONVEX_SELF_HOSTED_URL: "http://convex-backend:3210",
  CONVEX_INSTANCE_SECRET_FILE: "/run/secrets/site-convex-secret",
};

test("runtime contract accepts an isolated self-hosted instance", () => {
  const runtime = validateRuntime(RUNTIME);
  assert.equal(runtime.sourceRef, SOURCE_REF);
  assert.equal(runtime.backendUrl, "http://convex-backend:3210");
});

test("runtime contract rejects malformed and credential-bearing values", () => {
  assert.throws(
    () => validateRuntime({ ...RUNTIME, EXPECTED_APPLICATION_SOURCE_REF: "main" }),
    ReconciliationError,
  );
  assert.throws(
    () => validateRuntime({ ...RUNTIME, CONVEX_SELF_HOSTED_URL: "https://user:secret@example.test" }),
    ReconciliationError,
  );
});

test("secret reader confines reads and strips one terminal newline", async () => {
  assert.equal(
    await readSecretFile("/run/secrets/site", async () => "secret-value\n"),
    "secret-value",
  );
  await assert.rejects(
    readSecretFile("/tmp/site", async () => "secret-value"),
    ReconciliationError,
  );
});

test("admin key parser rejects diagnostic output", () => {
  assert.equal(parseAdminKey(`notice\n${"k".repeat(40)}\n`), "k".repeat(40));
  assert.throws(() => parseAdminKey("not a key"), ReconciliationError);
});

test("failure evidence is deterministic and excludes raw diagnostics", () => {
  const evidence = failureEvidence({ code: 1, signal: null, stdout: "token", stderr: "failure" });
  assert.equal(evidence.exitCode, 1);
  assert.match(evidence.diagnosticSha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(evidence).includes("token"), false);
});

test("backend readiness retries within its bound", async () => {
  let calls = 0;
  const attempt = await waitForBackend("http://backend", {
    fetcher: async () => ({ ok: ++calls === 2 }),
    sleep: async () => {},
    attempts: 3,
    delayMs: 0,
  });
  assert.equal(attempt, 2);
});

test("baked provenance must match both source and CLI", async () => {
  const files = new Map([
    ["/opt/application/.lacneu-source-ref", `${SOURCE_REF}\n`],
    ["/opt/application/.lacneu-convex-cli-version", "1.42.1\n"],
  ]);
  await verifyBakedContract(validateRuntime(RUNTIME), async (path) => files.get(path));
  files.set("/opt/application/.lacneu-source-ref", `${"b".repeat(40)}\n`);
  await assert.rejects(
    verifyBakedContract(validateRuntime(RUNTIME), async (path) => files.get(path)),
    ReconciliationError,
  );
});

test("reconciliation generates an ephemeral key then deploys functions", async () => {
  const calls = [];
  const files = new Map([
    ["/opt/application/.lacneu-source-ref", `${SOURCE_REF}\n`],
    ["/opt/application/.lacneu-convex-cli-version", "1.42.1\n"],
    ["/run/secrets/site-convex-secret", "instance-secret\n"],
  ]);
  const result = await reconcile(RUNTIME, {
    reader: async (path) => files.get(path),
    waiter: async () => 1,
    runner: async (command, args, options) => {
      calls.push({ command, args, options });
      return command.endsWith("generate_admin_key.sh")
        ? { code: 0, signal: null, stdout: `${"k".repeat(40)}\n`, stderr: "" }
        : { code: 0, signal: null, stdout: "deployed", stderr: "" };
    },
  });
  assert.equal(result.status, "reconciled");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.env.INSTANCE_SECRET, "instance-secret");
  assert.equal(calls[1].options.env.CONVEX_SELF_HOSTED_ADMIN_KEY, "k".repeat(40));
  assert.deepEqual(calls[1].args.slice(0, 3), ["deploy", "--typecheck", "enable"]);
});
