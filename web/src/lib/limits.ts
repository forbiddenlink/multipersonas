// Pure limit configuration + decision helpers. No I/O here so it stays unit-testable;
// the Supabase-backed enforcement lives in rate-limit.ts and spend.ts.

/** Per-caller request rate limits, enforced durably in Postgres (see rate-limit.ts). */
export const RATE_LIMITS = {
  authenticated: { max: 5, windowSeconds: 10 * 60 },
  anonymous: { max: 1, windowSeconds: 60 * 60 },
  // Public grader teaser: generous enough to try a few sites, still bounded.
  // Deliberately looser than `anonymous` (audits cost model calls; grades don't).
  grade: { max: 5, windowSeconds: 10 * 60 },
  // Waitlist signups: generous for a real person, bounded against spam. Per IP.
  waitlist: { max: 5, windowSeconds: 60 * 60 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/** Rough model-call budget per persona (persona step budgets, ~20-30 calls). Used to
 * reserve spend before a run so a burst can't blow past the daily cap. */
export const CALLS_PER_PERSONA = 25;

/**
 * Parse a positive integer env var. Empty string / NaN / ≤0 fall back — `Number("")`
 * is 0, which would otherwise collapse timeouts, poll intervals, and spend caps.
 */
export function positiveEnvInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Global daily model-call ceiling. Overridable per environment. */
export const DAILY_MODEL_CALL_CAP = positiveEnvInt(process.env.AUDIT_DAILY_CALL_CAP, 5000);

/**
 * Per-caller daily model-call ceiling, beneath the global cap. Stops one caller (a user
 * id, or an anon IP) from consuming the whole daily budget and denying everyone else.
 *
 * Defaults to ~5% of the global cap (250 calls ≈ 10 audits/caller/day at 25 calls each).
 * The point of a per-caller sub-cap is that draining the WHOLE daily budget must require
 * many distinct identities, not a handful: at 25% (the previous 1250) only 4 accounts/IPs
 * drained the entire day and 429'd every real user until UTC midnight — and with no CAPTCHA
 * on signup those 4 identities are trivially scriptable. At 5% it takes ~20 identities.
 * Raise AUDIT_CALLER_DAILY_CALL_CAP per environment if a legitimate power user needs more.
 */
export const CALLER_DAILY_CALL_CAP = positiveEnvInt(process.env.AUDIT_CALLER_DAILY_CALL_CAP, 250);

/** Hard stop for all runs, independent of limits — flip in the environment to freeze spend. */
export function killSwitchEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.AUDIT_KILL_SWITCH;
  return v === "1" || v === "true";
}

export function estimatedCallsFor(personaCount: number): number {
  return personaCount * CALLS_PER_PERSONA;
}

export function withinDailyCap(
  used: number,
  planned: number,
  cap: number = DAILY_MODEL_CALL_CAP,
): boolean {
  return used + planned <= cap;
}
