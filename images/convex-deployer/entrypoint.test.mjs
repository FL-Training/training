import assert from "node:assert/strict";
import test from "node:test";

import {
  ReconciliationError,
  failureEvidence,
  parseAdminKey,
  prepareWorkspace,
  readSecretFile,
  reconcile,
  safeDiagnosticExcerpt,
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

test("safe diagnostic excerpt preserves errors while redacting credentials", () => {
  const instanceSecret = "instance-secret-value";
  const adminKey = "admin-key-value";
  const excerpt = safeDiagnosticExcerpt(
    {
      stdout: `deployment rejected for ${instanceSecret}`,
      stderr: `Authorization: Bearer ${adminKey}\nAPI_KEY=another-sensitive-value`,
    },
    [instanceSecret, adminKey],
  );
  assert.match(excerpt, /deployment rejected/);
  assert.equal(excerpt.includes(instanceSecret), false);
  assert.equal(excerpt.includes(adminKey), false);
  assert.equal(excerpt.includes("another-sensitive-value"), false);
  assert.match(excerpt, /\[REDACTED\]/);
});

test("safe diagnostic excerpt is bounded", () => {
  const excerpt = safeDiagnosticExcerpt({ stdout: "x".repeat(16_384), stderr: "" });
  assert.ok(Buffer.byteLength(excerpt, "utf8") <= 4 * 1024 + 32);
  assert.match(excerpt, /\[TRUNCATED\]$/);
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

test("workspace preparation copies only mutable deployment inputs", async () => {
  const calls = [];
  const workspace = await prepareWorkspace("/source", "/temporary", {
    mkdtemp: async (prefix) => {
      calls.push(["mkdtemp", prefix]);
      return "/temporary/lacneu-convex-workspace-safe";
    },
    cp: async (...args) => calls.push(["cp", ...args]),
    symlink: async (...args) => calls.push(["symlink", ...args]),
    rm: async (...args) => calls.push(["rm", ...args]),
  });
  assert.equal(workspace, "/temporary/lacneu-convex-workspace-safe");
  assert.equal(calls[0][1], "/temporary/lacneu-convex-workspace-");
  assert.deepEqual(calls[1], [
    "cp",
    "/source/convex",
    "/temporary/lacneu-convex-workspace-safe/convex",
    { recursive: true },
  ]);
  assert.deepEqual(calls[2], [
    "cp",
    "/source/package.json",
    "/temporary/lacneu-convex-workspace-safe/package.json",
  ]);
  assert.deepEqual(calls[3], [
    "symlink",
    "/source/node_modules",
    "/temporary/lacneu-convex-workspace-safe/node_modules",
    "dir",
  ]);
});

test("workspace preparation removes partial data when a copy fails", async () => {
  const cleaned = [];
  await assert.rejects(
    prepareWorkspace("/source", "/temporary", {
      mkdtemp: async () => "/temporary/lacneu-convex-workspace-partial",
      cp: async () => {
        throw new Error("copy failed");
      },
      symlink: async () => {},
      rm: async (...args) => cleaned.push(args),
    }),
    /copy failed/,
  );
  assert.deepEqual(cleaned, [
    ["/temporary/lacneu-convex-workspace-partial", { recursive: true, force: true }],
  ]);
});

test("reconciliation generates an ephemeral key then deploys functions", async () => {
  const calls = [];
  const cleaned = [];
  const files = new Map([
    ["/opt/application/.lacneu-source-ref", `${SOURCE_REF}\n`],
    ["/opt/application/.lacneu-convex-cli-version", "1.42.1\n"],
    ["/run/secrets/site-convex-secret", "instance-secret\n"],
  ]);
  const result = await reconcile(RUNTIME, {
    reader: async (path) => files.get(path),
    waiter: async () => 1,
    workspaceFactory: async () => "/tmp/workspace",
    workspaceCleaner: async (path) => cleaned.push(path),
    runner: async (command, args, options) => {
      calls.push({ command, args, options });
      return command.endsWith("generate_admin_key.sh")
        ? { code: 0, signal: null, stdout: `${"k".repeat(40)}\n`, stderr: "" }
        : { code: 0, signal: null, stdout: "deployed", stderr: "" };
    },
  });
  assert.equal(result.status, "reconciled");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.cwd, "/convex");
  assert.equal(calls[0].options.env.INSTANCE_SECRET, "instance-secret");
  assert.equal(calls[1].options.cwd, "/tmp/workspace");
  assert.equal(calls[1].options.env.CONVEX_SELF_HOSTED_ADMIN_KEY, "k".repeat(40));
  assert.deepEqual(calls[1].args.slice(0, 3), ["deploy", "--typecheck", "enable"]);
  assert.deepEqual(cleaned, ["/tmp/workspace"]);
});

test("reconciliation reports a useful deploy error without leaking secrets", async () => {
  const instanceSecret = "instance-secret-value";
  const adminKey = "k".repeat(40);
  const files = new Map([
    ["/opt/application/.lacneu-source-ref", `${SOURCE_REF}\n`],
    ["/opt/application/.lacneu-convex-cli-version", "1.42.1\n"],
    ["/run/secrets/site-convex-secret", `${instanceSecret}\n`],
  ]);
  await assert.rejects(
    reconcile(RUNTIME, {
      reader: async (path) => files.get(path),
      waiter: async () => 1,
      workspaceFactory: async () => "/tmp/workspace-failed",
      workspaceCleaner: async () => {},
      runner: async (command) =>
        command.endsWith("generate_admin_key.sh")
          ? { code: 0, signal: null, stdout: `${adminKey}\n`, stderr: "" }
          : {
              code: 1,
              signal: null,
              stdout: "",
              stderr: `Convex rejected ${instanceSecret}; Authorization: Bearer ${adminKey}`,
            },
    }),
    (error) => {
      assert.match(error.message, /Convex function deployment failed/);
      assert.match(error.message, /Convex rejected/);
      assert.equal(error.message.includes(instanceSecret), false);
      assert.equal(error.message.includes(adminKey), false);
      return true;
    },
  );
});
