// Pure limit configuration + decision helpers. No I/O here so it stays unit-testable;
// the Supabase-backed enforcement lives in rate-limit.ts and spend.ts.

import { personaLibrary } from "@engine/personas/library";

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

/**
 * One agent-loop iteration makes at most one generateText call. Hosted audits accept
 * only built-in personas, so reserve the largest built-in step budget for every
 * selected persona rather than an average that can under-reserve a valid selection.
 */
export const CALLS_PER_PERSONA = Math.max(
  ...Object.values(personaLibrary).map((persona) => persona.maxSteps),
);

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
 * Defaults to ~5% of the global cap (250 calls covers eight maximum-budget personas).
 * The point of a per-caller sub-cap is that draining the WHOLE daily budget must require
 * many distinct identities, not a handful: at 25% (the previous 1250) only 4 accounts/IPs
 * drained the entire day and 429'd every real user until UTC midnight — and with no CAPTCHA
 * on signup those 4 identities are trivially scriptable. At 5% it takes ~20 identities.
 * Raise AUDIT_CALLER_DAILY_CALL_CAP per environment if a legitimate power user needs more.
 */
export const CALLER_DAILY_CALL_CAP = positiveEnvInt(process.env.AUDIT_CALLER_DAILY_CALL_CAP, 250);

/**
 * Lower per-caller daily ceiling while a caller's Stripe trial is running. A trial needs
 * only a card hold and an email, so ~20 trial accounts at the full per-caller cap could
 * drain the whole global budget and lock out paying users for the day. At 75 (three
 * maximum-budget personas) it takes ~67 identities. Never above the normal per-caller cap.
 * Override with AUDIT_TRIAL_CALLER_DAILY_CALL_CAP.
 */
export const TRIAL_CALLER_DAILY_CALL_CAP = Math.min(
  positiveEnvInt(process.env.AUDIT_TRIAL_CALLER_DAILY_CALL_CAP, 75),
  CALLER_DAILY_CALL_CAP,
);

/**
 * The per-caller cap for a caller whose trial ends at `trialEndsAt` (profiles.trial_ends_at).
 * Trialing only while that instant is in the future, so a late billing webhook cannot
 * stretch a trial. Null, missing or unparseable means not trialing.
 */
export function callerCapFor(trialEndsAt: string | null | undefined, now: number = Date.now()): number {
  const end = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  return Number.isFinite(end) && end > now ? TRIAL_CALLER_DAILY_CALL_CAP : CALLER_DAILY_CALL_CAP;
}

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
