/** Empty string / NaN / ≤0 → fallback. `Number("") === 0` would otherwise
 * collapse timeouts to instant fail and poll intervals to a busy loop. */
export function positiveEnvInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Run maintenance immediately at startup, then only after its configured interval. */
export function isIntervalDue(nowMs: number, lastRunMs: number | null, intervalMs: number): boolean {
  return lastRunMs === null || nowMs - lastRunMs >= intervalMs;
}

/**
 * Same AUDIT_KILL_SWITCH the web app reads. The web side stops new jobs from being
 * queued; this stops the worker from running jobs that were already queued, so flipping
 * the switch on both services freezes model spend immediately.
 */
export function killSwitchEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.AUDIT_KILL_SWITCH;
  return v === "1" || v === "true";
}
