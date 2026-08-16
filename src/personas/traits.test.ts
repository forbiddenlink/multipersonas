import { describe, it, expect } from "vitest";
import { deriveTraits, giveUpThreshold, maxDeadEnds, nextGiveUpState, needsConfirmBeforeIrreversible, nextIrreversibleConfirm, needsVisibleLabel, isIconOnlyName, unlabeledControlRefusal, isUnlabeledRefusal, misreadRecordedMessage, isMisreadRecorded, wrongClickRecordedMessage, isWrongClickRecorded, type TraitVector } from "./traits.js";
import { anxiousFirstTimer, elderlyUser, powerUserDeveloper } from "./library.js";
import { firstTimeVisitor, keyboardTraversal } from "./prebuilt.js";

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

describe("nextGiveUpState (code-enforced give-up decision)", () => {
  it("resets the streak and never gives up on a non-stuck step", () => {
    expect(nextGiveUpState(false, 5, 2)).toEqual({ streak: 0, giveUp: false });
  });

  it("accumulates the streak and gives up exactly when it reaches the budget", () => {
    // budget 1 (low persistence): gives up on the first stuck round.
    expect(nextGiveUpState(true, 0, 1)).toEqual({ streak: 1, giveUp: true });
    // budget 3 (high persistence): tolerates two, quits on the third.
    expect(nextGiveUpState(true, 0, 3)).toEqual({ streak: 1, giveUp: false });
    expect(nextGiveUpState(true, 1, 3)).toEqual({ streak: 2, giveUp: false });
    expect(nextGiveUpState(true, 2, 3)).toEqual({ streak: 3, giveUp: true });
  });

  it("an impatient persona (budget 1) quits after one stuck round; a persistent one (budget 3) survives two", () => {
    const impatient = maxDeadEnds(base({ persistence: 0 })); // 1
    const persistent = maxDeadEnds(base({ persistence: 1 })); // 3
    expect(nextGiveUpState(true, 0, impatient).giveUp).toBe(true);
    expect(nextGiveUpState(true, 0, persistent).giveUp).toBe(false);
  });
});

describe("needsConfirmBeforeIrreversible", () => {
  it("is a no-op at the legacy-neutral 0.5, and trips for cautious personas", () => {
    expect(needsConfirmBeforeIrreversible(0.5)).toBe(false);
    expect(needsConfirmBeforeIrreversible(0)).toBe(false);
    expect(needsConfirmBeforeIrreversible(0.7)).toBe(true);
    expect(needsConfirmBeforeIrreversible(0.85)).toBe(true);
  });
});

describe("nextIrreversibleConfirm", () => {
  it("pauses on the first encounter and proceeds on the repeat", () => {
    const first = nextIrreversibleConfirm("Place Order", null);
    expect(first).toEqual({ pause: true, pending: "Place Order" });
    const second = nextIrreversibleConfirm("Place Order", first.pending);
    expect(second).toEqual({ pause: false, pending: null });
  });

  it("resets the pause when the control changes", () => {
    const first = nextIrreversibleConfirm("Place Order", null);
    const other = nextIrreversibleConfirm("Delete account", first.pending);
    expect(other).toEqual({ pause: true, pending: "Delete account" });
  });
});

describe("roster: cautious personas confirm, others do not", () => {
  it("Margaret and Linda pause before irreversible clicks; Alex does not", () => {
    expect(needsConfirmBeforeIrreversible(deriveTraits(elderlyUser).riskAversion)).toBe(true);
    expect(needsConfirmBeforeIrreversible(deriveTraits(anxiousFirstTimer).riskAversion)).toBe(true);
    expect(needsConfirmBeforeIrreversible(deriveTraits(powerUserDeveloper).riskAversion)).toBe(false);
  });
});

describe("needsVisibleLabel", () => {
  it("is a no-op at the legacy-neutral 0.5, and trips for proficiency 1–2", () => {
    expect(needsVisibleLabel(0.5)).toBe(false);
    expect(needsVisibleLabel(1)).toBe(false);
    expect(needsVisibleLabel(0.35)).toBe(false);
    expect(needsVisibleLabel(0.25)).toBe(true);
    expect(needsVisibleLabel(0)).toBe(true);
  });
});

describe("isIconOnlyName", () => {
  it("treats empty, symbol-only, and single-letter names as unlabeled", () => {
    expect(isIconOnlyName("")).toBe(true);
    expect(isIconOnlyName("   ")).toBe(true);
    expect(isIconOnlyName("×")).toBe(true);
    expect(isIconOnlyName("🛒")).toBe(true);
    expect(isIconOnlyName("X")).toBe(true);
    expect(isIconOnlyName("i")).toBe(true);
  });

  it("treats short words as labels", () => {
    expect(isIconOnlyName("Go")).toBe(false);
    expect(isIconOnlyName("OK")).toBe(false);
    expect(isIconOnlyName("Menu")).toBe(false);
    expect(isIconOnlyName("Place Order")).toBe(false);
    expect(isIconOnlyName("email")).toBe(false);
  });
});

describe("unlabeledControlRefusal", () => {
  it("is detectable and tells the model to find a labeled control", () => {
    const empty = unlabeledControlRefusal("");
    expect(isUnlabeledRefusal(empty)).toBe(true);
    expect(empty).toMatch(/usability issue/i);
    expect(empty).not.toMatch(/—/);
    const shown = unlabeledControlRefusal("×");
    expect(shown).toContain('it reads as "×"');
  });
});

describe("roster: low-tech personas need visible labels; traversal does not", () => {
  it("Margaret, Linda, and Sarah must see a label; Alex and keyboard traversal must not be gated", () => {
    expect(needsVisibleLabel(deriveTraits(elderlyUser).techLiteracy)).toBe(true);
    expect(needsVisibleLabel(deriveTraits(anxiousFirstTimer).techLiteracy)).toBe(true);
    expect(needsVisibleLabel(deriveTraits(firstTimeVisitor).techLiteracy)).toBe(true);
    expect(needsVisibleLabel(deriveTraits(powerUserDeveloper).techLiteracy)).toBe(false);
    expect(needsVisibleLabel(deriveTraits(keyboardTraversal).techLiteracy)).toBe(false);
  });
});

describe("misread / wrong_click recorded messages", () => {
  it("records a misread without sounding like a click or a finding", () => {
    const msg = misreadRecordedMessage({
      selector: "SSO",
      expected: "a search box",
      actual: "single sign-on",
    });
    expect(isMisreadRecorded(msg)).toBe(true);
    expect(msg).toContain("SSO");
    expect(msg).toMatch(/not a click/i);
    expect(msg).toMatch(/usability issue/i);
    expect(msg).not.toMatch(/—/);
  });

  it("records a wrong click as an admission, not a click", () => {
    const msg = wrongClickRecordedMessage({
      selector: "Cancel",
      intended: "Place Order",
    });
    expect(isWrongClickRecorded(msg)).toBe(true);
    expect(msg).toContain("Cancel");
    expect(msg).toMatch(/did not click/i);
    expect(msg).not.toMatch(/—/);
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
