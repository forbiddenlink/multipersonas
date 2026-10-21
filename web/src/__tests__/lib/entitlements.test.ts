import { describe, it, expect } from "vitest";
import { PROJECT_LIMITS, getExactPlan, getSessionPlan, readProfileWithEffectivePlan, planAllowsPersonas, planDisplayName, planUpgradeSummary } from "@/lib/entitlements";
import { PAST_DUE_GRACE_DAYS, isEntitledSubscriptionStatus, pastDueGraceEndsAt, planAfterGrace } from "@/lib/plans";

describe("planAllowsPersonas", () => {
  it("allows pro and team", () => {
    expect(planAllowsPersonas("pro")).toBe(true);
    expect(planAllowsPersonas("team")).toBe(true);
  });
  it("denies free, anon (null/undefined), and unknown plans", () => {
    expect(planAllowsPersonas("free")).toBe(false);
    expect(planAllowsPersonas(null)).toBe(false);
    expect(planAllowsPersonas(undefined)).toBe(false);
    expect(planAllowsPersonas("enterprise")).toBe(false);
  });
});

describe("planDisplayName", () => {
  it("maps stored tiers to the names /pricing sells", () => {
    expect(planDisplayName("pro")).toBe("Solo");
    expect(planDisplayName("team")).toBe("Agency founding");
    expect(planDisplayName("free")).toBe("Free");
  });
  it("never leaks a raw or unknown slug", () => {
    expect(planDisplayName(null)).toBe("Free");
    expect(planDisplayName(undefined)).toBe("Free");
    expect(planDisplayName("enterprise")).toBe("Free");
  });
});

describe("planUpgradeSummary", () => {
  it("states the enforced Solo project cap and names both paid plans", () => {
    const summary = planUpgradeSummary();
    expect(summary).toContain(`up to ${PROJECT_LIMITS.pro} projects`);
    expect(summary).toContain("Solo");
    expect(summary).toContain("Agency founding");
    expect(summary).not.toMatch(/\bPro\b/);
  });
});

describe("past_due grace window", () => {
  const DAY = 86_400_000;
  const NOW = Date.parse("2026-10-20T12:00:00Z");
  const iso = (offset: number): string => new Date(NOW + offset).toISOString();
  const periodStart = (daysAgo: number): number => (NOW - daysAgo * DAY) / 1000;

  it("entitles active and trialing always, past_due only inside the window", () => {
    expect(isEntitledSubscriptionStatus("active")).toBe(true);
    expect(isEntitledSubscriptionStatus("trialing")).toBe(true);
    const end = pastDueGraceEndsAt([periodStart(PAST_DUE_GRACE_DAYS - 1)]);
    expect(isEntitledSubscriptionStatus("past_due", end, NOW)).toBe(true);
    const lapsed = pastDueGraceEndsAt([periodStart(PAST_DUE_GRACE_DAYS + 1)]);
    expect(isEntitledSubscriptionStatus("past_due", lapsed, NOW)).toBe(false);
    expect(isEntitledSubscriptionStatus("past_due", null, NOW)).toBe(false);
  });

  it.each(["unpaid", "canceled", "incomplete", "incomplete_expired", "paused"])("never entitles %s, even with a future grace end", (status) => {
    expect(isEntitledSubscriptionStatus(status, NOW + DAY, NOW)).toBe(false);
  });

  it("anchors the window on the newest period start and fails closed without one", () => {
    expect(pastDueGraceEndsAt([periodStart(10), periodStart(2)])).toBe(NOW - 2 * DAY + PAST_DUE_GRACE_DAYS * DAY);
    expect(pastDueGraceEndsAt([])).toBeNull();
    expect(pastDueGraceEndsAt([undefined, null])).toBeNull();
  });

  it("downgrades a stored paid plan to free once the grace end has passed", () => {
    expect(planAfterGrace("team", iso(DAY), null, NOW)).toBe("team");
    expect(planAfterGrace("team", iso(-DAY), null, NOW)).toBe("free");
    expect(planAfterGrace("pro", iso(0), null, NOW)).toBe("free");
    expect(planAfterGrace("pro", null, null, NOW)).toBe("pro");
    expect(planAfterGrace("team", iso(-DAY), "pro", NOW)).toBe("pro");
    expect(planAfterGrace("team", iso(DAY), "pro", NOW)).toBe("team");
  });

  it("picks the highest tier whose own grace is still open once the strongest tier lapses", () => {
    // Agency past_due from Oct 1 (grace to Oct 8), Solo past_due from Oct 5 (grace to Oct 12).
    const anchors = { sub_agency: { plan: "team", ends_at: iso(-DAY) }, sub_solo: { plan: "pro", ends_at: iso(3 * DAY) } };
    expect(planAfterGrace("team", iso(-DAY), null, NOW, anchors)).toBe("pro");
    expect(planAfterGrace("team", iso(-DAY), null, NOW + 4 * DAY, anchors)).toBe("free");
    expect(planAfterGrace("team", iso(-DAY), "pro", NOW + 4 * DAY, anchors)).toBe("pro");
    const both = { sub_agency: { plan: "team", ends_at: iso(DAY) }, sub_solo: { plan: "pro", ends_at: iso(3 * DAY) } };
    expect(planAfterGrace("team", iso(DAY), null, NOW, both)).toBe("team");
    // Malformed or legacy string anchors are ignored: the legacy path decides.
    expect(planAfterGrace("team", iso(-DAY), "pro", NOW, { a: iso(DAY) } as never)).toBe("pro");
    expect(planAfterGrace("team", iso(-DAY), null, NOW, {})).toBe("free");
  });

  it("never lets an anchor raise the plan above the stored one", () => {
    expect(planAfterGrace("pro", iso(-DAY), null, NOW, { s: { plan: "team", ends_at: iso(DAY) } })).toBe("pro");
  });

  function fakeSupabase(row: Record<string, unknown> | null, firstError: { code: string } | null = null) {
    const selects: string[] = [];
    const client = {
      from: () => ({
        select: (columns: string) => {
          selects.push(columns);
          const fail = firstError && selects.length === 1;
          return { eq: () => ({ single: async () => (fail ? { data: null, error: firstError } : { data: row, error: null }) }) };
        },
      }),
    };
    return { client: client as never, selects };
  }

  it("gates the persona and tier reads on an expired grace window", async () => {
    const lapsed = fakeSupabase({ plan: "team", access_grace_ends_at: new Date(Date.now() - DAY).toISOString() });
    expect(await getSessionPlan(lapsed.client, "u1")).toBe("free");
    expect(await getExactPlan(lapsed.client, "u1")).toBe("free");
    const inside = fakeSupabase({ plan: "team", access_grace_ends_at: new Date(Date.now() + DAY).toISOString() });
    expect(await getExactPlan(inside.client, "u1")).toBe("team");
    expect(await getSessionPlan(inside.client, "u1")).toBe("team");
  });

  it("keeps a lower tier's open grace after the stronger tier's grace expires (getExactPlan)", async () => {
    const row = {
      plan: "team",
      access_grace_ends_at: new Date(Date.now() - DAY).toISOString(),
      grace_fallback_plan: null,
      access_grace_anchors: {
        sub_agency: { plan: "team", ends_at: new Date(Date.now() - DAY).toISOString() },
        sub_solo: { plan: "pro", ends_at: new Date(Date.now() + 3 * DAY).toISOString() },
      },
    };
    expect(await getExactPlan(fakeSupabase(row).client, "u1")).toBe("pro");
  });

  it("falls back to the plain plan before the grace column exists", async () => {
    const legacy = fakeSupabase({ plan: "pro" }, { code: "42703" });
    expect(await getExactPlan(legacy.client, "u1")).toBe("pro");
    expect(legacy.selects).toEqual(["plan,access_grace_ends_at,grace_fallback_plan,access_grace_anchors", "plan"]);
  });

  it("returns the requested columns with an effective plan for checkout and settings", async () => {
    const lapsed = fakeSupabase({ plan: "pro", stripe_customer_id: "cus_1", access_grace_ends_at: new Date(Date.now() - DAY).toISOString() });
    const res = await readProfileWithEffectivePlan<{ plan: string; stripe_customer_id: string }>(lapsed.client, "u1", "plan,stripe_customer_id");
    expect(res.data).toEqual({ plan: "free", stripe_customer_id: "cus_1" });
    const legacy = fakeSupabase({ plan: "pro", stripe_customer_id: "cus_1" }, { code: "PGRST204" });
    expect((await readProfileWithEffectivePlan(legacy.client, "u1", "plan,stripe_customer_id")).data?.plan).toBe("pro");
  });
});
