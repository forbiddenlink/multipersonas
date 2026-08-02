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

/** Global daily model-call ceiling. Overridable per environment. */
export const DAILY_MODEL_CALL_CAP = Number(process.env.AUDIT_DAILY_CALL_CAP ?? 5000);

/**
 * Per-caller daily model-call ceiling, beneath the global cap. Stops one caller (a user
 * id, or an anon IP) from consuming the whole daily budget and denying everyone else.
 * Defaults to ~25% of the global cap (~50 audits/caller/day at 25 calls each).
 */
export const CALLER_DAILY_CALL_CAP = Number(process.env.AUDIT_CALLER_DAILY_CALL_CAP ?? 1250);

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
