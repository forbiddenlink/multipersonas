import { execFileSync, fork, type Serializable } from "node:child_process";
import { chmodSync, chownSync, mkdtempSync } from "node:fs";

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

/**
 * SEC-001: the uid the scan (and the Chromium it starts) runs as. The worker holds the
 * Supabase service-role key in its environment and memory. A process running as the same
 * uid can read both through /proc/<pid>/environ and /proc/<pid>/mem, so an env allowlist
 * alone does not protect the key from a renderer exploit. A different uid, with no
 * capabilities and no_new_privs, can read neither. The image entrypoint sets these.
 */
export interface ScanIsolation {
  uid: number;
  gid: number;
  home: string;
}

function positiveId(raw: string | undefined, name: string): number {
  if (!raw || !/^[1-9]\d*$/.test(raw)) throw new Error(`${name} must be a positive numeric id`);
  return Number(raw);
}

/** Read the scan identity. Returns null when unset, unless AUDIT_REQUIRE_SCAN_ISOLATION=1,
 * in which case a missing identity is a hard error rather than a silent same-uid scan. */
export function scanIsolationFromEnv(env: NodeJS.ProcessEnv = process.env): ScanIsolation | null {
  const required = env.AUDIT_REQUIRE_SCAN_ISOLATION === "1";
  if (!env.AUDIT_SCAN_UID && !env.AUDIT_SCAN_GID) {
    if (required) throw new Error("AUDIT_REQUIRE_SCAN_ISOLATION=1 but AUDIT_SCAN_UID/AUDIT_SCAN_GID are not set");
    return null;
  }
  const home = env.AUDIT_SCAN_HOME;
  if (!home || !home.startsWith("/")) throw new Error("AUDIT_SCAN_HOME must be an absolute path");
  return { uid: positiveId(env.AUDIT_SCAN_UID, "AUDIT_SCAN_UID"), gid: positiveId(env.AUDIT_SCAN_GID, "AUDIT_SCAN_GID"), home };
}

/** setpriv prefix that switches to the scan identity and leaves it no way back: no
 * supplementary groups, no inheritable or ambient capabilities (so the exec'd program
 * starts with an empty permitted set), and no_new_privs (so no setuid binary restores one). */
export function scanDropPrivileges(isolation: ScanIsolation): string[] {
  return [
    `--reuid=${isolation.uid}`, `--regid=${isolation.gid}`, "--clear-groups",
    "--inh-caps=-all", "--ambient-caps=-all", "--no-new-privs", "--",
  ];
}

/** How the scan child is started: under the Linux supervisor (which reaps detached Chromium),
 * wrapped in setpriv when isolated. Isolation is Linux-only; refusing elsewhere keeps a
 * misconfiguration from quietly running the scan as the key-holding uid. */
export function scanLaunch(
  isolation: ScanIsolation | null,
  platform: NodeJS.Platform = process.platform,
): { execPath?: string; execArgv: string[] } {
  if (platform !== "linux") {
    if (isolation) throw new Error("Scan uid isolation requires Linux");
    return { execArgv: ["--import", "tsx"] };
  }
  const supervised = [new URL("./scan-supervisor.py", import.meta.url).pathname, process.execPath, "--import", "tsx"];
  if (!isolation) return { execPath: "python3", execArgv: supervised };
  return { execPath: "setpriv", execArgv: [...scanDropPrivileges(isolation), "python3", ...supervised] };
}

/** Environment for the scan child: the allowlist, with HOME pointing at the scan user's own home. */
export function scanEnv(isolation: ScanIsolation | null, source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = scanChildEnv(source);
  if (isolation) env.HOME = isolation.home;
  return env;
}

/** Create a fresh output directory the scan can write and this process can read and delete.
 * Under isolation the directory is group-owned by the scan group with the setgid bit, and the
 * supervisor runs the scan with umask 007, so everything it writes stays removable here. */
export function createScanOutputDir(prefix: string, isolation: ScanIsolation | null): string {
  const dir = mkdtempSync(prefix);
  if (isolation) {
    chownSync(dir, -1, isolation.gid);
    chmodSync(dir, 0o2770);
  }
  return dir;
}

const ISOLATION_PROBE = [
  "id -u",
  "grep -E '^(CapPrm|CapEff|CapAmb|NoNewPrivs):' /proc/self/status",
  'if head -c 1 "/proc/$1/environ" >/dev/null 2>&1; then echo environ:readable; else echo environ:denied; fi',
].join("; ");

/** Judge the probe output: a different non-root uid, no capabilities, no_new_privs, and the
 * worker's environment unreadable. Returns the failures; empty means isolated. */
export function isolationProbeFailures(output: string, isolation: ScanIsolation, workerUid: number): string[] {
  const lines = output.trim().split("\n").map((line) => line.trim());
  const field = (name: string): string | undefined =>
    lines.find((line) => line.startsWith(`${name}:`))?.slice(name.length + 1).trim();
  const failures: string[] = [];
  const uid = lines[0];
  if (uid !== String(isolation.uid)) failures.push(`scan uid is ${uid ?? "unknown"}, expected ${isolation.uid}`);
  if (uid === String(workerUid) || uid === "0") failures.push(`scan uid ${uid} can read the worker's memory`);
  for (const cap of ["CapPrm", "CapEff", "CapAmb"]) {
    const value = field(cap);
    if (value === undefined || !/^0+$/.test(value)) failures.push(`${cap} is ${value ?? "unknown"}, expected none`);
  }
  if (field("NoNewPrivs") !== "1") failures.push("no_new_privs is not set");
  if (!lines.includes("environ:denied")) failures.push("scan can read the worker's /proc environ");
  return failures;
}

/** Boot-time proof on the real host: start a process exactly the way scans are started and
 * check it cannot read this process's environment. Throws, so the worker exits before
 * claiming work, if the host does not give the uid split the image expects. */
export function assertScanIsolation(isolation: ScanIsolation): void {
  const workerUid = process.getuid?.();
  if (workerUid === undefined) throw new Error("Scan uid isolation requires a POSIX host");
  const output = execFileSync(
    "setpriv",
    [...scanDropPrivileges(isolation), "sh", "-c", ISOLATION_PROBE, "sh", String(process.pid)],
    { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, timeout: 10_000 },
  );
  const failures = isolationProbeFailures(output, isolation, workerUid);
  if (failures.length) throw new Error(`Scan isolation check failed: ${failures.join("; ")}`);
}

export function runJobProcess<T>(
  entry: string | URL,
  input: Serializable,
  timeoutMs: number,
  isolation: ScanIsolation | null = scanIsolationFromEnv(),
): Promise<T> {
  // Scanners need model/egress settings, never database write credentials or alert sinks.
  const env = scanEnv(isolation);
  const child = fork(entry, [], {
    ...scanLaunch(isolation),
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
