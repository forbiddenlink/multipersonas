import { execFileSync, fork, type Serializable } from "node:child_process";

export class ScanCleanupError extends Error {}

function signal(pid: number, value: NodeJS.Signals): void {
  try { process.kill(pid, value); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

/** Playwright can start Chromium in a separate process group. Freeze the scan and
 * its descendants before killing them, including those separate browser groups. */
function terminateTree(pid: number): void {
  const stopped = new Set([pid]);
  signal(pid, "SIGSTOP");
  for (;;) {
    const rows = execFileSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" })
      .trim().split("\n").map((line) => line.trim().split(/\s+/).map(Number));
    let added = false;
    for (const [child, parent] of rows) {
      if (child && parent && stopped.has(parent) && !stopped.has(child)) {
        signal(child, "SIGSTOP");
        stopped.add(child);
        added = true;
      }
    }
    if (!added) break;
  }
  for (const child of [...stopped].reverse()) signal(child, "SIGKILL");
}

/** Variables the scan child may inherit. Everything else is dropped, so a secret added to
 * the worker later (database, billing, email, alert sinks) is not inherited by the process
 * that drives a stranger's page. The child needs the model key, egress-proxy and sandbox
 * settings, and the usual process basics. */
const SCAN_ENV_EXACT = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "LANG", "LANGUAGE", "TZ", "TERM", "TMPDIR", "TEMP", "TMP",
  "NODE_ENV", "NODE_PATH", "NODE_OPTIONS", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy",
  "DISPLAY", "FONTCONFIG_PATH", "FONTCONFIG_FILE", "CI",
]);
const SCAN_ENV_PREFIXES = ["LC_", "XDG_", "PLAYWRIGHT_", "AUDIT_", "MP_", "ANTHROPIC_", "PERSONAUDIT_", "MULTIPERSONAS_"];

export function scanChildEnv(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (SCAN_ENV_EXACT.has(name) || SCAN_ENV_PREFIXES.some((prefix) => name.startsWith(prefix))) env[name] = value;
  }
  return env;
}

export function runJobProcess<T>(entry: string | URL, input: Serializable, timeoutMs: number): Promise<T> {
  // Scanners need model/egress settings, never database write credentials or alert sinks.
  const env = scanChildEnv();
  const child = fork(entry, [], {
    ...(process.platform === "linux" ? {
      execPath: "python3",
      execArgv: [new URL("./scan-supervisor.py", import.meta.url).pathname, process.execPath, "--import", "tsx"],
    } : { execArgv: ["--import", "tsx"] }),
    env, detached: true,
    serialization: "advanced", stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let received = false;
    let failure: Error | undefined;
    let cleanupFailure: ScanCleanupError | undefined;
    let stopping = false;
    const stop = (): void => {
      if (stopping) return;
      stopping = true;
      if (child.pid) {
        try { terminateTree(child.pid); } catch (error) {
          cleanupFailure = new ScanCleanupError(`Scan cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
          signal(child.pid, "SIGKILL");
        }
      }
    };
    const timer = setTimeout(() => {
      failure = new Error(`Scan exceeded ${timeoutMs}ms`);
      stop();
    }, timeoutMs);
    child.on("message", (message: unknown) => {
      const reply = message as { result?: T; error?: string } | null;
      if (!reply || typeof reply !== "object" || !("result" in reply || typeof reply.error === "string")) {
        failure = new Error("Invalid scan result");
      } else if (typeof reply.error === "string") failure = new Error(reply.error);
      else { result = reply.result as T; received = true; }
      stop();
    });
    child.once("error", (error) => { failure = error; stop(); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (process.platform === "linux" && code === 70) {
        cleanupFailure = new ScanCleanupError("Scan supervisor could not confirm descendant cleanup");
      }
      if (cleanupFailure) reject(cleanupFailure);
      else if (failure) reject(failure);
      else if (!received) reject(new Error("Scan process exited without a result"));
      else resolve(result);
    });
    child.send(input, (error) => { if (error) { failure = error; stop(); } });
  });
}
