import { afterEach, describe, expect, it } from "vitest";
import { PROJECT_LIMITS, planAllowsPersonas, planAllowsReportBranding, projectLimitFor } from "@/lib/entitlements";
import { GRANT_RANK, PLANS, isPlanKey, trialPeriodDays } from "@/lib/plans";
import { isFoundingCheckoutOpen, isSoloCheckoutOpen } from "@/lib/founding-checkout";

const ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_FOUNDING_PRICE_ID",
  "STRIPE_SOLO_PRICE_ID",
  "NEXT_PUBLIC_FOUNDING_CHECKOUT_URL",
  "STRIPE_TRIAL_DAYS",
] as const;

const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function setSharedCredentials(): void {
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service_test";
}

describe("paid tiers are different from each other", () => {
  it("grants a different plan value per tier, so the tiers are not cosmetic", () => {
    expect(PLANS.solo.grants).toBe("pro");
    expect(PLANS.founding.grants).toBe("team");
    expect(PLANS.solo.grants).not.toBe(PLANS.founding.grants);
  });

  it("ranks the agency grant above the solo grant", () => {
    expect(GRANT_RANK[PLANS.founding.grants]).toBeGreaterThan(GRANT_RANK[PLANS.solo.grants]);
    expect(GRANT_RANK.free).toBe(0);
  });

  it("caps projects per tier, with the free tier smallest and the agency tier unlimited", () => {
    expect(projectLimitFor("free")).toBe(PROJECT_LIMITS.free);
    expect(PROJECT_LIMITS.free).toBeLessThan(PROJECT_LIMITS.pro as number);
    expect(projectLimitFor("team")).toBeNull();
  });

  it("unlocks personas on both paid tiers but white-label only on the agency tier", () => {
    expect(planAllowsPersonas("pro")).toBe(true);
    expect(planAllowsPersonas("team")).toBe(true);
    expect(planAllowsReportBranding("pro")).toBe(false);
    expect(planAllowsReportBranding("team")).toBe(true);
  });

  it("fails closed on an unknown or missing plan", () => {
    expect(planAllowsPersonas(undefined)).toBe(false);
    expect(planAllowsReportBranding(null)).toBe(false);
    expect(planAllowsReportBranding("enterprise")).toBe(false);
    expect(isPlanKey("other")).toBe(false);
    expect(isPlanKey(undefined)).toBe(false);
  });
});

describe("trial length", () => {
  it("defaults to 14 days and rejects junk rather than collapsing to zero", () => {
    delete process.env.STRIPE_TRIAL_DAYS;
    expect(trialPeriodDays()).toBe(14);
    expect(trialPeriodDays({ STRIPE_TRIAL_DAYS: "" })).toBe(14);
    expect(trialPeriodDays({ STRIPE_TRIAL_DAYS: "abc" })).toBe(14);
    expect(trialPeriodDays({ STRIPE_TRIAL_DAYS: "-3" })).toBe(14);
  });

  it("honours an explicit zero so the trial can be switched off", () => {
    expect(trialPeriodDays({ STRIPE_TRIAL_DAYS: "0" })).toBe(0);
    expect(trialPeriodDays({ STRIPE_TRIAL_DAYS: "7" })).toBe(7);
  });
});

describe("checkout configuration gates", () => {
  it("keeps the solo tier invisible until its Stripe price exists", () => {
    setSharedCredentials();
    delete process.env.STRIPE_SOLO_PRICE_ID;
    expect(isSoloCheckoutOpen()).toBe(false);
    process.env.STRIPE_SOLO_PRICE_ID = "price_solo";
    expect(isSoloCheckoutOpen()).toBe(true);
  });

  it("keeps the founding launch switch, so credentials alone cannot reopen the offer", () => {
    setSharedCredentials();
    process.env.STRIPE_FOUNDING_PRICE_ID = "price_founding";
    delete process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL;
    expect(isFoundingCheckoutOpen()).toBe(false);
    process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL = "https://buy.stripe.com/test";
    expect(isFoundingCheckoutOpen()).toBe(true);
  });

  it("closes every tier when a shared credential is missing", () => {
    setSharedCredentials();
    process.env.STRIPE_SOLO_PRICE_ID = "price_solo";
    process.env.STRIPE_FOUNDING_PRICE_ID = "price_founding";
    process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL = "https://buy.stripe.com/test";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(isSoloCheckoutOpen()).toBe(false);
    expect(isFoundingCheckoutOpen()).toBe(false);
  });
});
