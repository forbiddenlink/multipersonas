import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";

const { fork } = vi.hoisted(() => ({ fork: vi.fn() }));
vi.mock("node:child_process", () => ({ fork, execFileSync: vi.fn() }));
import { runJobProcess, ScanCleanupError } from "./job-process.js";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("rejects promptly when the scan executable cannot be started", async () => {
  vi.useFakeTimers();
  const child = Object.assign(new EventEmitter(), { send: vi.fn() });
  fork.mockReturnValue(child);
  const result = runJobProcess("scan.ts", {}, 60_000);
  const settled = vi.fn();
  void result.then(settled, settled);
  const error = Object.assign(new Error("spawn python3 ENOENT"), { code: "ENOENT" });
  child.emit("error", error);
  child.emit("close", -2, null);
  await Promise.resolve();
  expect(settled).toHaveBeenCalledWith(error);
  expect(vi.getTimerCount()).toBe(0);
});

it("treats supervisor cleanup failure as fatal even after scan failure", async () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  const child = Object.assign(new EventEmitter(), { send: vi.fn() });
  fork.mockReturnValue(child);
  const result = runJobProcess("scan.ts", {}, 60_000);
  const assertion = expect(result).rejects.toBeInstanceOf(ScanCleanupError);
  child.emit("message", { error: "scan crashed" });
  child.emit("exit", 70, null);
  child.emit("close", 70, null);
  await assertion;
});

it.each(["timeout", "error", "send", "message"])("preserves fatal teardown errors after a late %s failure", async (event) => {
  vi.useFakeTimers();
  vi.stubGlobal("process", { ...process, platform: "darwin", kill: vi.fn() });
  const child = Object.assign(new EventEmitter(), { pid: 123, send: vi.fn() });
  fork.mockReturnValue(child);
  const result = runJobProcess("scan.ts", {}, 100);
  const assertion = expect(result).rejects.toBeInstanceOf(ScanCleanupError);
  // The process inspection boundary returns no process table: cleanup cannot be verified.
  child.emit("message", { result: { pages: 1 } });
  if (event === "timeout") vi.advanceTimersByTime(100);
  if (event === "error") child.emit("error", new Error("IPC closed"));
  if (event === "send") child.send.mock.calls[0]![1](new Error("IPC send failed"));
  if (event === "message") child.emit("message", { error: "late scan failure" });
  child.emit("close", null, "SIGKILL");
  await assertion;
});
