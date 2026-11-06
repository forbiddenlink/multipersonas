import { isIntervalDue } from "./config.js";

// Only a successful claim that finds no job is evidence the queue is idle.
// Errors and the kill switch keep the base retry cadence instead of backing off.
export type ClaimOutcome = "ran" | "empty" | "retry";

export class IdlePollBackoff {
  private nextIdleMs: number;
  private readonly maxMs: number;

  constructor(private readonly baseMs: number, maxMs: number) {
    this.nextIdleMs = baseMs;
    this.maxMs = Math.max(baseMs, maxMs);
  }

  next(outcome: ClaimOutcome): number {
    if (outcome !== "empty") {
      this.nextIdleMs = this.baseMs;
      return outcome === "ran" ? 0 : this.baseMs;
    }
    const waitMs = this.nextIdleMs;
    this.nextIdleMs = Math.min(this.maxMs, waitMs * 2);
    return waitMs;
  }
}

/** Stop an idle wait immediately on shutdown, without interrupting a running job. */
export function waitForPoll(waitMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, waitMs);
    signal.addEventListener("abort", finish, { once: true });
  });
}

interface PollingOptions {
  pollMs: number;
  idlePollMaxMs: number;
  reapIntervalMs: number;
  signal: AbortSignal;
  reapStaleJobs: () => Promise<void>;
  claimAndRun: () => Promise<ClaimOutcome>;
  onError: (error: unknown) => Promise<void>;
}

/** Always-on queue draining with bounded idle waits and time-based maintenance. */
export async function runPollingLoop(options: PollingOptions): Promise<void> {
  const { pollMs, idlePollMaxMs, reapIntervalMs, signal } = options;
  const backoff = new IdlePollBackoff(pollMs, idlePollMaxMs);
  let lastReapAt: number | null = null;

  while (!signal.aborted) {
    let outcome: ClaimOutcome = "retry";
    try {
      if (isIntervalDue(Date.now(), lastReapAt, reapIntervalMs)) {
        lastReapAt = Date.now();
        await options.reapStaleJobs();
      }
      // SIGTERM may arrive while maintenance is in flight. Do not claim new work.
      if (signal.aborted) break;
      outcome = await options.claimAndRun();
    } catch (error) {
      await options.onError(error);
    }

    if (signal.aborted) break;
    const pollWaitMs = backoff.next(outcome);
    if (pollWaitMs > 0) {
      // A longer idle interval must not postpone stale-job recovery. As before,
      // a running job is allowed to finish before maintenance or shutdown.
      const untilReapMs = lastReapAt === null
        ? 0
        : Math.max(0, lastReapAt + reapIntervalMs - Date.now());
      await waitForPoll(Math.min(pollWaitMs, untilReapMs), signal);
    }
  }
}
