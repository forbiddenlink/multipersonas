import { describe, it, expect } from "vitest";
import { planAllowsPersonas } from "@/lib/entitlements";

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
