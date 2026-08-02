import { describe, it, expect } from "vitest";
import { deriveTraits, giveUpThreshold, maxDeadEnds, type TraitVector } from "./traits.js";

describe("deriveTraits (back-compat)", () => {
  it("maps patienceLevel + techProficiency for a legacy persona (no traits)", () => {
    const t = deriveTraits({ patienceLevel: "low", techProficiency: 1 });
    expect(t.patience).toBeCloseTo(0.2);
    expect(t.techLiteracy).toBe(0); // (1-1)/4
    expect(t.persistence).toBeCloseTo(0.2); // correlated with patience
    expect(t.riskAversion).toBe(0.5); // neutral default
    expect(t.attentionToDetail).toBe(0.5);
  });

  it("maps high patience + max tech", () => {
    const t = deriveTraits({ patienceLevel: "high", techProficiency: 5 });
    expect(t.patience).toBeCloseTo(0.85);
    expect(t.techLiteracy).toBe(1); // (5-1)/4
  });

  it("explicit traits override the derived values, clamped to 0..1", () => {
    const t = deriveTraits({
      patienceLevel: "high",
      techProficiency: 5,
      traits: { patience: 0.1, riskAversion: 2 /* over 1 -> clamped */ },
    });
    expect(t.patience).toBe(0.1); // overridden
    expect(t.riskAversion).toBe(1); // clamped
    expect(t.techLiteracy).toBe(1); // untouched by partial override
  });
});

describe("giveUpThreshold", () => {
  it("impatient personas notice 'stuck' sooner, bounded 2..4", () => {
    const impatient: TraitVector = base({ patience: 0 });
    const patient: TraitVector = base({ patience: 1 });
    expect(giveUpThreshold(impatient)).toBe(2);
    expect(giveUpThreshold(patient)).toBe(4);
    expect(giveUpThreshold(base({ patience: 0.5 }))).toBe(3);
  });
});

describe("maxDeadEnds", () => {
  it("low persistence gives up after one dead end, bounded 1..3", () => {
    expect(maxDeadEnds(base({ persistence: 0 }))).toBe(1);
    expect(maxDeadEnds(base({ persistence: 1 }))).toBe(3);
  });

  it("a low-patience persona gives up strictly sooner than a high-patience one", () => {
    const impatient = deriveTraits({ patienceLevel: "low", techProficiency: 3 });
    const patient = deriveTraits({ patienceLevel: "high", techProficiency: 3 });
    // Earlier stuck detection AND fewer tolerated dead ends = strictly sooner give-up.
    expect(giveUpThreshold(impatient)).toBeLessThan(giveUpThreshold(patient));
    expect(maxDeadEnds(impatient)).toBeLessThan(maxDeadEnds(patient));
  });
});

function base(over: Partial<TraitVector>): TraitVector {
  return {
    patience: 0.5,
    techLiteracy: 0.5,
    persistence: 0.5,
    riskAversion: 0.5,
    attentionToDetail: 0.5,
    ...over,
  };
}
