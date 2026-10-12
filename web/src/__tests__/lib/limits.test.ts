import { describe, it, expect, vi, afterEach } from "vitest";
import {
  RATE_LIMITS,
  killSwitchEnabled,
  estimatedCallsFor,
  withinDailyCap,
  CALLS_PER_PERSONA,
  positiveEnvInt,
  CALLER_DAILY_CALL_CAP,
  TRIAL_CALLER_DAILY_CALL_CAP,
  callerCapFor,
} from "@/lib/limits";
import { personaLibrary } from "@engine/personas/library";

describe("positiveEnvInt", () => {
  it("returns the fallback for missing, empty, or non-positive values", () => {
    expect(positiveEnvInt(undefined, 42)).toBe(42);
    expect(positiveEnvInt("", 42)).toBe(42);
    expect(positiveEnvInt("  ", 42)).toBe(42);
    expect(positiveEnvInt("0", 42)).toBe(42);
    expect(positiveEnvInt("-3", 42)).toBe(42);
    expect(positiveEnvInt("nope", 42)).toBe(42);
    expect(positiveEnvInt("0.5", 42)).toBe(42);
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
  it("reserves each selected persona's maximum possible agent-loop calls", () => {
    expect(CALLS_PER_PERSONA).toBe(
      Math.max(...Object.values(personaLibrary).map((persona) => persona.maxSteps)),
    );
  });

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

describe("trial caller cap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults well under the normal per-caller cap", () => {
    expect(TRIAL_CALLER_DAILY_CALL_CAP).toBeLessThan(CALLER_DAILY_CALL_CAP);
    expect(TRIAL_CALLER_DAILY_CALL_CAP).toBeGreaterThanOrEqual(CALLS_PER_PERSONA);
  });

  it("applies the trial cap only while the trial is in the future", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    expect(callerCapFor("2026-10-13T00:00:00Z", now)).toBe(TRIAL_CALLER_DAILY_CALL_CAP);
    expect(callerCapFor("2026-10-12T11:59:59Z", now)).toBe(CALLER_DAILY_CALL_CAP);
    expect(callerCapFor("2026-10-12T12:00:00Z", now)).toBe(CALLER_DAILY_CALL_CAP);
    expect(callerCapFor(null, now)).toBe(CALLER_DAILY_CALL_CAP);
    expect(callerCapFor(undefined, now)).toBe(CALLER_DAILY_CALL_CAP);
    expect(callerCapFor("not a date", now)).toBe(CALLER_DAILY_CALL_CAP);
  });

  it("is configurable by env and never exceeds the normal per-caller cap", async () => {
    vi.stubEnv("AUDIT_TRIAL_CALLER_DAILY_CALL_CAP", "40");
    vi.resetModules();
    expect((await import("@/lib/limits")).TRIAL_CALLER_DAILY_CALL_CAP).toBe(40);

    vi.stubEnv("AUDIT_TRIAL_CALLER_DAILY_CALL_CAP", "999999");
    vi.stubEnv("AUDIT_CALLER_DAILY_CALL_CAP", "100");
    vi.resetModules();
    expect((await import("@/lib/limits")).TRIAL_CALLER_DAILY_CALL_CAP).toBe(100);
  });
});
