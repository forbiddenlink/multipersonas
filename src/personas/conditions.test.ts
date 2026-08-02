import { describe, it, expect } from "vitest";
import { resolveConditions } from "./conditions.js";

describe("resolveConditions", () => {
  it("a persona with no conditions overrides nothing (back-compat)", () => {
    expect(resolveConditions({})).toEqual({});
    expect(resolveConditions({ conditions: undefined })).toEqual({});
  });

  it("maps reducedMotion/forcedColors booleans to Playwright option strings", () => {
    expect(resolveConditions({ conditions: { reducedMotion: true } })).toEqual({
      reducedMotion: "reduce",
    });
    expect(resolveConditions({ conditions: { forcedColors: true } })).toEqual({
      forcedColors: "active",
    });
    expect(resolveConditions({ conditions: { reducedMotion: false } })).toEqual({
      reducedMotion: "no-preference",
    });
  });

  it("passes colorScheme through and combines multiple conditions", () => {
    expect(
      resolveConditions({ conditions: { colorScheme: "dark", forcedColors: true, reducedMotion: true } }),
    ).toEqual({ colorScheme: "dark", forcedColors: "active", reducedMotion: "reduce" });
  });
});
