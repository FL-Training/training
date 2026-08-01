import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MAX_SECRET_BYTES = 128 * 1024;
const MAX_PROCESS_OUTPUT_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;

export class ReconciliationError extends Error {}

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new ReconciliationError(`${name} is required`);
  }
  return value;
}

function assertPattern(value, pattern, label) {
  if (!pattern.test(value)) {
    throw new ReconciliationError(`${label} is invalid`);
  }
  return value;
}

function assertUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ReconciliationError(`${label} is invalid`);
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ReconciliationError(`${label} is invalid`);
  }
  return parsed.toString().replace(/\/$/, "");
}

export function validateRuntime(environment) {
  return {
    sourceRef: assertPattern(
      required(environment, "EXPECTED_APPLICATION_SOURCE_REF"),
      /^[0-9a-f]{40}$/,
      "EXPECTED_APPLICATION_SOURCE_REF",
    ),
    convexVersion: assertPattern(
      required(environment, "EXPECTED_CONVEX_CLI_VERSION"),
      /^\d+\.\d+\.\d+$/,
      "EXPECTED_CONVEX_CLI_VERSION",
    ),
    instanceName: assertPattern(
      required(environment, "INSTANCE_NAME"),
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
      "INSTANCE_NAME",
    ),
    backendUrl: assertUrl(
      required(environment, "CONVEX_SELF_HOSTED_URL"),
      "CONVEX_SELF_HOSTED_URL",
    ),
    instanceSecretPath: required(environment, "CONVEX_INSTANCE_SECRET_FILE"),
  };
}

function stripTerminalLineBreak(value) {
  return value.endsWith("\r\n")
    ? value.slice(0, -2)
    : value.endsWith("\n")
      ? value.slice(0, -1)
      : value;
}

export async function readSecretFile(path, reader = readFile) {
  if (!path?.startsWith("/run/secrets/")) {
    throw new ReconciliationError("secret path must be under /run/secrets");
  }
  const content = await reader(path, { encoding: "utf8" });
  if (Buffer.byteLength(content, "utf8") > MAX_SECRET_BYTES) {
    throw new ReconciliationError("secret exceeds the maximum supported size");
  }
  if (content.includes("\u0000")) {
    throw new ReconciliationError("secret contains a NUL byte");
  }
  const normalized = stripTerminalLineBreak(content);
  if (!normalized) {
    throw new ReconciliationError("secret is empty");
  }
  return normalized;
}

export async function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const fail = (error) => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(error);
      }
    };
    const timer = setTimeout(() => {
      fail(new ReconciliationError(`process timed out: ${command}`));
    }, timeoutMs);
    const collect = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_PROCESS_OUTPUT_BYTES) {
        throw new ReconciliationError(`process output exceeded limit: ${command}`);
      }
      return next;
    };
    child.stdout.on("data", (chunk) => {
      try {
        stdout = collect(stdout, chunk);
      } catch (error) {
        fail(error);
      }
    });
    child.stderr.on("data", (chunk) => {
      try {
        stderr = collect(stderr, chunk);
      } catch (error) {
        fail(error);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      fail(new ReconciliationError(`process could not start: ${command}: ${error.message}`));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ code, signal, stdout, stderr });
      }
    });
  });
}

export function parseAdminKey(stdout) {
  const candidate = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) ?? "";
  if (!/^[A-Za-z0-9._~+/:|=-]{20,4096}$/.test(candidate)) {
    throw new ReconciliationError("Convex admin key generation returned an invalid value");
  }
  return candidate;
}

export function failureEvidence(result) {
  const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    exitCode: Number.isInteger(result.code) ? result.code : null,
    signal: result.signal ?? null,
    diagnosticSha256: createHash("sha256").update(diagnostic).digest("hex"),
  };
}

function failureMessage(label, result) {
  const evidence = failureEvidence(result);
  const fields = [
    `exit=${evidence.exitCode ?? "unknown"}`,
    `diagnostic_sha256=${evidence.diagnosticSha256}`,
  ];
  if (evidence.signal) {
    fields.push(`signal=${evidence.signal}`);
  }
  return `${label} (${fields.join(", ")})`;
}

export async function waitForBackend(url, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const attempts = options.attempts ?? 30;
  const delayMs = options.delayMs ?? 2_000;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(`${url}/version`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        return attempt;
      }
    } catch {
      // A bounded retry is expected while the backend is starting.
    }
    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }
  throw new ReconciliationError("Convex backend did not become ready before the deadline");
}

export async function verifyBakedContract(runtime, reader = readFile) {
  const markers = [
    ["/opt/application/.lacneu-source-ref", runtime.sourceRef, "application source"],
    [
      "/opt/application/.lacneu-convex-cli-version",
      runtime.convexVersion,
      "Convex CLI",
    ],
  ];
  for (const [path, expected, label] of markers) {
    const actual = stripTerminalLineBreak(await reader(path, { encoding: "utf8" }));
    if (actual !== expected) {
      throw new ReconciliationError(`${label} provenance mismatch`);
    }
  }
}

export async function reconcile(environment = process.env, dependencies = {}) {
  const runtime = validateRuntime(environment);
  const reader = dependencies.reader ?? readFile;
  const runner = dependencies.runner ?? runProcess;
  await verifyBakedContract(runtime, reader);
  const instanceSecret = await readSecretFile(runtime.instanceSecretPath, reader);
  const readyAttempt = await (dependencies.waiter ?? waitForBackend)(runtime.backendUrl);
  const keyResult = await runner("/convex/generate_admin_key.sh", [], {
    cwd: "/convex",
    env: {
      ...process.env,
      INSTANCE_NAME: runtime.instanceName,
      INSTANCE_SECRET: instanceSecret,
      DATA_DIR: "/tmp/lacneu-convex-key",
    },
  });
  if (keyResult.code !== 0) {
    throw new ReconciliationError(
      failureMessage("Convex admin key generation failed", keyResult),
    );
  }
  const adminKey = parseAdminKey(keyResult.stdout);
  const deploy = await runner(
    "/opt/application/node_modules/.bin/convex",
    [
      "deploy",
      "--typecheck",
      "enable",
      "--message",
      `Lacneu reconcile ${runtime.sourceRef}`,
    ],
    {
      cwd: "/opt/application",
      env: {
        ...process.env,
        CONVEX_SELF_HOSTED_URL: runtime.backendUrl,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        NO_COLOR: "1",
      },
      timeoutMs: 10 * 60_000,
    },
  );
  if (deploy.code !== 0) {
    throw new ReconciliationError(
      failureMessage("Convex function deployment failed", deploy),
    );
  }
  return {
    schema_version: 1,
    status: "reconciled",
    source_ref: runtime.sourceRef,
    convex_cli_version: runtime.convexVersion,
    backend_ready_attempt: readyAttempt,
    functions_deployed: true,
  };
}

async function main() {
  try {
    process.stdout.write(`${JSON.stringify(await reconcile())}\n`);
  } catch (error) {
    const message =
      error instanceof ReconciliationError
        ? error.message
        : "unexpected reconciliation failure";
    process.stderr.write(`ERROR: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
