import "server-only";

/**
 * Paid plan catalogue. One entry per Stripe price the app can open checkout for.
 *
 * `key` is written into Stripe metadata as `personaudit_plan` and read back by the
 * webhook, so it is a stored contract: renaming a key orphans live subscriptions.
 * Each plan maps to an existing `profiles.plan` value, so adding a tier needs no
 * database migration and no RLS change. The two paid tiers are not cosmetic: they
 * grant different values, and the differences are enforced in lib/entitlements.ts.
 */
export type PlanKey = "founding" | "solo";

type PlanConfig = {
  /** Env var holding the Stripe price id for this plan. */
  readonly priceEnv: "STRIPE_FOUNDING_PRICE_ID" | "STRIPE_SOLO_PRICE_ID";
  /** Where Stripe returns the buyer when they abandon checkout. */
  readonly cancelPath: string;
  readonly monthlyUsd: number;
  /** The `profiles.plan` value this purchase grants. */
  readonly grants: "pro" | "team";
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  founding: { priceEnv: "STRIPE_FOUNDING_PRICE_ID", cancelPath: "/for-agencies", monthlyUsd: 199, grants: "team" },
  solo: { priceEnv: "STRIPE_SOLO_PRICE_ID", cancelPath: "/pricing", monthlyUsd: 39, grants: "pro" },
};

/** Rank used when a customer somehow holds more than one entitled subscription. */
export const GRANT_RANK: Record<"free" | "pro" | "team", number> = { free: 0, pro: 1, team: 2 };

export const PLAN_KEYS = Object.keys(PLANS) as readonly PlanKey[];

export function isPlanKey(value: string | null | undefined): value is PlanKey {
  return value === "founding" || value === "solo";
}

/**
 * Free-trial length in days, 0 to disable. A trial makes the first checkout land on
 * `payment_status: "no_payment_required"` and the subscription on `status: "trialing"`;
 * both are already treated as entitled by the webhook, so this needs no other change.
 */
export function trialPeriodDays(env: Record<string, string | undefined> = process.env): number {
  const raw = env.STRIPE_TRIAL_DAYS;
  if (raw === undefined || raw.trim() === "") return 14;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 14;
  return Math.floor(n);
}
