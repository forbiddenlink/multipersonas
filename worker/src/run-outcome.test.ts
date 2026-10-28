import { describe, expect, it } from "vitest";
import { assertSomePersonaRan } from "./run-outcome.js";

describe("assertSomePersonaRan", () => {
  it("throws when every persona errored, so the job fails", () => {
    expect(() => assertSomePersonaRan({ errored: 3, total: 3 })).toThrow(
      "Every persona run errored before its first step (3/3)",
    );
  });

  it("does not throw when only some personas errored, so the job still completes", () => {
    expect(() => assertSomePersonaRan({ errored: 2, total: 3 })).not.toThrow();
  });

  it("does not throw when no persona errored", () => {
    expect(() => assertSomePersonaRan({ errored: 0, total: 3 })).not.toThrow();
  });

  it("does not throw for an empty run (total 0), which is the axe-only path", () => {
    expect(() => assertSomePersonaRan({ errored: 0, total: 0 })).not.toThrow();
  });
});
