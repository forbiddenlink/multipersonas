import { afterEach, describe, expect, it, vi } from "vitest";
import { IdlePollBackoff, runPollingLoop, waitForPoll, type ClaimOutcome } from "./polling.js";

afterEach(() => vi.useRealTimers());

describe("IdlePollBackoff", () => {
  it("backs off only empty claims and remains capped", () => {
    const backoff = new IdlePollBackoff(3000, 15000);
    expect(Array.from({ length: 7 }, () => backoff.next("empty")))
      .toEqual([3000, 6000, 12000, 15000, 15000, 15000, 15000]);
  });

  it("drains busy queues immediately and resets the next idle wait", () => {
    const backoff = new IdlePollBackoff(3000, 15000);
    for (let i = 0; i < 5; i++) backoff.next("empty");
    expect(backoff.next("ran")).toBe(0);
    expect(backoff.next("ran")).toBe(0);
    expect(backoff.next("empty")).toBe(3000);
  });

  it("resets retries rather than treating errors as an idle queue", () => {
    const backoff = new IdlePollBackoff(3000, 15000);
    for (let i = 0; i < 5; i++) backoff.next("empty");
    expect(backoff.next("retry")).toBe(3000);
    expect(backoff.next("empty")).toBe(3000);
    expect(backoff.next("empty")).toBe(6000);
  });

  it("allows the fixed cadence and never goes below the configured base", () => {
    for (const maxMs of [1000, 3000]) {
      const backoff = new IdlePollBackoff(3000, maxMs);
      expect(Array.from({ length: 5 }, () => backoff.next("empty")))
        .toEqual([3000, 3000, 3000, 3000, 3000]);
    }
  });
});

function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const shutdown = new AbortController();
  const reapStaleJobs = vi.fn(async () => {});
  const claimAndRun = vi.fn(async (): Promise<ClaimOutcome> => "empty");
  const onError = vi.fn(async (_error: unknown) => {});
  const options = {
    pollMs: 3000,
    idlePollMaxMs: 15000,
    reapIntervalMs: 60000,
    signal: shutdown.signal,
    reapStaleJobs,
    claimAndRun,
    onError,
  };
  return { options, shutdown, reapStaleJobs, claimAndRun, onError };
}

describe("runPollingLoop", () => {
  it("polls at the bounded idle cadence and wakes for maintenance on time", async () => {
    const { options, shutdown, reapStaleJobs, claimAndRun } = setup();
    const claims: number[] = [];
    const reaps: number[] = [];
    claimAndRun.mockImplementation(async () => { claims.push(Date.now()); return "empty"; });
    reapStaleJobs.mockImplementation(async () => { reaps.push(Date.now()); });
    const loop = runPollingLoop(options);
    await vi.advanceTimersByTimeAsync(60000);
    shutdown.abort();
    await loop;
    expect(claims).toEqual([0, 3000, 9000, 21000, 36000, 51000, 60000]);
    expect(reaps).toEqual([0, 60000]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reaps between continuously busy jobs without adding a poll wait", async () => {
    const { options, shutdown, reapStaleJobs, claimAndRun } = setup();
    const events: string[] = [];
    reapStaleJobs.mockImplementation(async () => { events.push(`reap:${Date.now()}`); });
    claimAndRun.mockImplementation(async () => {
      events.push(`claim:${Date.now()}`);
      vi.setSystemTime(Date.now() + 30000);
      if (claimAndRun.mock.calls.length === 5) shutdown.abort();
      return "ran";
    });
    await runPollingLoop(options);
    expect(events).toEqual([
      "reap:0", "claim:0", "claim:30000", "reap:60000",
      "claim:60000", "claim:90000", "reap:120000", "claim:120000",
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets a long idle backoff as soon as work runs", async () => {
    const { options, shutdown, claimAndRun } = setup();
    const claims: number[] = [];
    claimAndRun.mockImplementation(async () => {
      claims.push(Date.now());
      return claims.length === 4 ? "ran" : "empty";
    });
    const loop = runPollingLoop(options);
    await vi.advanceTimersByTimeAsync(24000);
    shutdown.abort();
    await loop;
    expect(claims).toEqual([0, 3000, 9000, 21000, 21000, 24000]);
  });

  it.each(["retry", "throw"])("returns to the base interval after %s", async (failure) => {
    const { options, shutdown, claimAndRun, onError } = setup();
    const claims: number[] = [];
    const error = new Error("claim failed");
    claimAndRun.mockImplementation(async () => {
      claims.push(Date.now());
      if (claims.length === 4) {
        if (failure === "throw") throw error;
        return "retry";
      }
      return "empty";
    });
    const loop = runPollingLoop(options);
    await vi.advanceTimersByTimeAsync(27000);
    shutdown.abort();
    await loop;
    expect(claims).toEqual([0, 3000, 9000, 21000, 24000, 27000]);
    expect(onError).toHaveBeenCalledTimes(failure === "throw" ? 1 : 0);
    if (failure === "throw") expect(onError).toHaveBeenCalledWith(error);
  });

  it("reports a maintenance exception and retries without a busy loop", async () => {
    const { options, shutdown, reapStaleJobs, claimAndRun, onError } = setup();
    const error = new Error("maintenance failed");
    reapStaleJobs.mockRejectedValueOnce(error);
    const loop = runPollingLoop(options);
    await vi.advanceTimersByTimeAsync(2999);
    expect(claimAndRun).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(claimAndRun).toHaveBeenCalledTimes(1);
    shutdown.abort();
    await loop;
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("preserves maintenance deadlines even with a much higher idle cap", async () => {
    const { options, shutdown, reapStaleJobs } = setup();
    const reaps: number[] = [];
    reapStaleJobs.mockImplementation(async () => { reaps.push(Date.now()); });
    const loop = runPollingLoop({ ...options, idlePollMaxMs: 120000 });
    await vi.advanceTimersByTimeAsync(180000);
    shutdown.abort();
    await loop;
    expect(reaps).toEqual([0, 60000, 120000, 180000]);
  });

  it("does no work after a shutdown already requested at startup", async () => {
    const { options, shutdown, reapStaleJobs, claimAndRun } = setup();
    shutdown.abort();
    await runPollingLoop(options);
    expect(reapStaleJobs).not.toHaveBeenCalled();
    expect(claimAndRun).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not claim new work if shutdown arrives during maintenance", async () => {
    const { options, shutdown, reapStaleJobs, claimAndRun } = setup();
    reapStaleJobs.mockImplementation(async () => { shutdown.abort(); });
    await runPollingLoop(options);
    expect(claimAndRun).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finishes the current job before stopping and never starts another", async () => {
    const { options, shutdown, claimAndRun } = setup();
    let finishJob!: (outcome: ClaimOutcome) => void;
    claimAndRun.mockImplementation(() => new Promise((resolve) => { finishJob = resolve; }));
    let stopped = false;
    const loop = runPollingLoop(options).then(() => { stopped = true; });
    await vi.advanceTimersByTimeAsync(0);
    shutdown.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    finishJob("ran");
    await loop;
    expect(stopped).toBe(true);
    expect(claimAndRun).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps fixed polling when the idle maximum equals the base", async () => {
    const { options, shutdown, claimAndRun } = setup();
    const loop = runPollingLoop({ ...options, idlePollMaxMs: options.pollMs });
    await vi.advanceTimersByTimeAsync(15000);
    shutdown.abort();
    await loop;
    expect(claimAndRun).toHaveBeenCalledTimes(6);
  });
});

describe("waitForPoll", () => {
  it("resolves immediately for an already aborted signal", async () => {
    const { shutdown } = setup();
    shutdown.abort();
    await waitForPoll(15000, shutdown.signal);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels an outstanding wait immediately on shutdown", async () => {
    const { shutdown } = setup();
    const remove = vi.spyOn(shutdown.signal, "removeEventListener");
    const wait = waitForPoll(15000, shutdown.signal);
    shutdown.abort();
    await wait;
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(Date.now()).toBe(0);
  });

  it("cleans up the abort listener after normal expiry", async () => {
    const { shutdown } = setup();
    const remove = vi.spyOn(shutdown.signal, "removeEventListener");
    const wait = waitForPoll(3000, shutdown.signal);
    await vi.advanceTimersByTimeAsync(3000);
    await wait;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
