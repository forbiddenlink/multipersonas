import { describe, it, expect } from "vitest";
import { PROJECT_LIMITS, planAllowsPersonas, planDisplayName, planUpgradeSummary } from "@/lib/entitlements";

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
