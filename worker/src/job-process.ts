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

export function runJobProcess<T>(entry: string | URL, input: Serializable, timeoutMs: number): Promise<T> {
  // Scanners need model/egress settings, never database write credentials or alert sinks.
  const env = { ...process.env };
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  delete env.WORKER_ALERT_WEBHOOK;
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
