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

/** Days a `past_due` subscription keeps paid access, counted from the failed renewal. */
export const PAST_DUE_GRACE_DAYS = 7;

/**
 * Stripe subscription statuses that keep paid access: `active` and `trialing` always;
 * `past_due` only inside the grace window (see `pastDueGraceEndsAt`). Stripe can leave a
 * subscription `past_due` after retries finish, so the status alone must never grant access
 * indefinitely. Access ends on `unpaid`, `canceled`, `incomplete_expired`, `incomplete` and
 * `paused`. Single source for the webhook.
 */
export function isEntitledSubscriptionStatus(status: string, graceEndsAtMs: number | null = null, now: number = Date.now()): boolean {
  if (status === "active" || status === "trialing") return true;
  return status === "past_due" && graceEndsAtMs !== null && now < graceEndsAtMs;
}

/**
 * When a `past_due` subscription's grace ends (epoch ms), or null when the failed-renewal
 * time is unknown (fail closed: no grace). The anchor is the newest item
 * `current_period_start`: a failed renewal invoice opens the new period, so it is the
 * first-failed-payment time. The webhook payload already carries it.
 */
export function pastDueGraceEndsAt(periodStartsSeconds: readonly (number | null | undefined)[]): number | null {
  const starts = periodStartsSeconds.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (starts.length === 0) return null;
  return Math.max(...starts) * 1000 + PAST_DUE_GRACE_DAYS * 86_400_000;
}

/** One past_due subscription's own window: the tier it grants and when that grace ends. */
export type GraceAnchor = { plan: "pro" | "team"; ends_at: string };

/** Keeps only well-formed anchors; anything else (including legacy bare-string values) is dropped. */
export function parseGraceAnchors(raw: unknown): Record<string, GraceAnchor> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, GraceAnchor> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { plan, ends_at } = value as { plan?: unknown; ends_at?: unknown };
    if ((plan === "pro" || plan === "team") && typeof ends_at === "string" && Number.isFinite(Date.parse(ends_at))) out[id] = { plan, ends_at };
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * The plan to honour at read time. No Stripe event fires when a `past_due` grace window
 * simply runs out, so the webhook stores `access_grace_ends_at` and every plan read applies
 * it. When per-subscription `anchors` are stored, the answer is the highest tier whose OWN
 * window is still open, else the firm (non-grace) plan in `fallbackPlan`, else `free`, never
 * above the stored `plan`. Without anchors (older rows) a paid plan whose grace has passed
 * drops to `fallbackPlan` or `free`, until a webhook confirms recovery.
 */
export function planAfterGrace<T extends string>(
  plan: T,
  graceEndsAt: string | null | undefined,
  fallbackPlan: string | null | undefined = null,
  now: number = Date.now(),
  anchors: unknown = null,
): T | "free" | "pro" | "team" {
  if (!graceEndsAt) return plan;
  const parsed = parseGraceAnchors(anchors);
  if (parsed) {
    let best: "free" | "pro" | "team" = fallbackPlan === "pro" || fallbackPlan === "team" ? fallbackPlan : "free";
    for (const { plan: tier, ends_at } of Object.values(parsed)) {
      if (now < Date.parse(ends_at) && GRANT_RANK[tier] > GRANT_RANK[best]) best = tier;
    }
    const stored = (plan === "pro" || plan === "team" ? plan : "free") as "free" | "pro" | "team";
    return GRANT_RANK[best] > GRANT_RANK[stored] ? stored : best;
  }
  const end = Date.parse(graceEndsAt);
  if (!Number.isFinite(end) || now < end) return plan;
  // Expired: drop to the strongest plan another subscription still pays for, else free.
  return fallbackPlan === "pro" || fallbackPlan === "team" ? fallbackPlan : "free";
}

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
