import { describe, it, expect } from "vitest";
import {
  RATE_LIMITS,
  killSwitchEnabled,
  estimatedCallsFor,
  withinDailyCap,
  CALLS_PER_PERSONA,
  positiveEnvInt,
} from "@/lib/limits";

describe("positiveEnvInt", () => {
  it("returns the fallback for missing, empty, or non-positive values", () => {
    expect(positiveEnvInt(undefined, 42)).toBe(42);
    expect(positiveEnvInt("", 42)).toBe(42);
    expect(positiveEnvInt("  ", 42)).toBe(42);
    expect(positiveEnvInt("0", 42)).toBe(42);
    expect(positiveEnvInt("-3", 42)).toBe(42);
    expect(positiveEnvInt("nope", 42)).toBe(42);
  });
  it("parses positive integers", () => {
    expect(positiveEnvInt("7", 42)).toBe(7);
    expect(positiveEnvInt("3.9", 42)).toBe(3);
  });
});

describe("killSwitchEnabled", () => {
  it("is off when the env var is absent", () => {
    expect(killSwitchEnabled({})).toBe(false);
  });
  it("is on for '1' or 'true'", () => {
    expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "1" })).toBe(true);
    expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "true" })).toBe(true);
  });
  it("is off for other values", () => {
    expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "0" })).toBe(false);
    expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "no" })).toBe(false);
  });
});

describe("estimatedCallsFor", () => {
  it("scales with persona count", () => {
    expect(estimatedCallsFor(0)).toBe(0);
    expect(estimatedCallsFor(3)).toBe(3 * CALLS_PER_PERSONA);
  });
});

describe("withinDailyCap", () => {
  it("allows when used + planned stays at or under the cap", () => {
    expect(withinDailyCap(0, 100, 1000)).toBe(true);
    expect(withinDailyCap(900, 100, 1000)).toBe(true); // exactly at cap
  });
  it("rejects when it would exceed the cap", () => {
    expect(withinDailyCap(950, 100, 1000)).toBe(false);
    expect(withinDailyCap(1000, 1, 1000)).toBe(false);
  });
});

describe("RATE_LIMITS", () => {
  it("is stricter for anonymous than authenticated", () => {
    expect(RATE_LIMITS.anonymous.max).toBeLessThan(RATE_LIMITS.authenticated.max);
    expect(RATE_LIMITS.anonymous.windowSeconds).toBeGreaterThanOrEqual(
      RATE_LIMITS.authenticated.windowSeconds,
    );
  });
});
