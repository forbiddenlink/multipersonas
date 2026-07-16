import { describe, it, expect } from "vitest";
import { analyse, verdict, primaryOutcome, identity, KILL_THRESHOLD_PCT, type Violation, type StateScan } from "./measure.js";

/**
 * The diff decides whether the product lives. A bug that inflates net-new would
 * tell us to build something nobody needs, so the flattering directions are
 * tested harder than the honest ones.
 */

const v = (ruleId: string, target: string, impact: Violation["impact"] = "critical"): Violation => ({
  ruleId,
  impact,
  target,
  help: `${ruleId} help`,
});

const state = (name: string, violations: Violation[], error?: string): StateScan => ({
  name,
  whyCrawlerMisses: "test",
  violations,
  error,
});

describe("identity", () => {
  it("keys on rule + element, not impact", () => {
    expect(identity(v("color-contrast", "#a", "critical"))).toBe(
      identity(v("color-contrast", "#a", "minor")),
    );
  });

  it("separates the same rule on different elements", () => {
    expect(identity(v("label", "#a"))).not.toBe(identity(v("label", "#b")));
  });
});

describe("analyse — global chrome must not count as a discovery", () => {
  it("excludes a violation the baseline already reported, even when it recurs everywhere", () => {
    const baseline = [v("color-contrast", "header .logo")];
    const states = [
      state("cart", [v("color-contrast", "header .logo")]),
      state("checkout", [v("color-contrast", "header .logo")]),
    ];
    const a = analyse(baseline, states);
    expect(a.netNew).toHaveLength(0);
    expect(a.netNewBlockingPct).toBe(0);
  });

  it("counts a genuinely new element failing a rule the baseline also had", () => {
    const baseline = [v("label", "#search")];
    const states = [state("checkout", [v("label", "#search"), v("label", "#postcode")])];
    const a = analyse(baseline, states);
    expect(a.netNew.map((x) => x.target)).toEqual(["#postcode"]);
    // The rule itself is not new — it fired on the entry page too.
    expect(a.netNewRuleIds).toEqual([]);
  });

  it("flags a rule that never fires on the entry page as a net-new rule type", () => {
    const baseline = [v("color-contrast", "header")];
    const states = [state("checkout-error", [v("aria-valid-attr-value", "#err")])];
    const a = analyse(baseline, states);
    expect(a.netNewRuleIds).toEqual(["aria-valid-attr-value"]);
  });

  it("does not double-count the same finding across two states", () => {
    const states = [
      state("cart", [v("label", "#qty")]),
      state("checkout", [v("label", "#qty")]),
    ];
    const a = analyse([], states);
    expect(a.netNew).toHaveLength(1);
  });
});

describe("analyse — the kill-criterion number", () => {
  it("is the share of ALL blocking violations that are net-new", () => {
    // 1 blocking in baseline, 3 new blocking in deep states => 3/4 = 75%
    const baseline = [v("color-contrast", "header")];
    const states = [
      state("cart", [v("label", "#a"), v("label", "#b")]),
      state("checkout", [v("label", "#c")]),
    ];
    const a = analyse(baseline, states);
    expect(a.netNewBlocking).toHaveLength(3);
    expect(a.netNewBlockingPct).toBeCloseTo(75, 5);
  });

  it("ignores moderate/minor findings — they cannot carry a kill decision", () => {
    const states = [state("cart", [v("region", "#x", "moderate"), v("tabindex", "#y", "minor")])];
    const a = analyse([], states);
    expect(a.netNew).toHaveLength(2); // still reported
    expect(a.netNewBlocking).toHaveLength(0); // but not blocking
    expect(a.netNewBlockingPct).toBe(0);
  });

  it("returns 0, not NaN, when nothing blocking exists anywhere", () => {
    const a = analyse([], [state("cart", [])]);
    expect(a.netNewBlockingPct).toBe(0);
    expect(Number.isNaN(a.netNewBlockingPct)).toBe(false);
  });
});

describe("analyse — failed states are recorded, never dropped", () => {
  it("lists a state that errored and contributes nothing", () => {
    const states = [
      state("cart", [v("label", "#a")]),
      state("checkout", [], "timeout waiting for .cart_list"),
    ];
    const a = analyse([], states);
    expect(a.failedStates).toEqual(["checkout"]);
    expect(a.perState.find((s) => s.name === "checkout")?.error).toMatch(/timeout/);
  });
});

describe("verdict", () => {
  it("kills below the threshold", () => {
    const baseline = [v("a", "#1"), v("b", "#2"), v("c", "#3"), v("d", "#4")];
    const states = [state("cart", [v("e", "#5")])]; // 1/5 = 20%
    const result = verdict(analyse(baseline, states));
    expect(result.pass).toBe(false);
    expect(result.line).toMatch(/KILL/);
  });

  it("passes at or above the threshold", () => {
    const baseline = [v("a", "#1")];
    const states = [state("cart", [v("b", "#2")])]; // 1/2 = 50%
    const result = verdict(analyse(baseline, states));
    expect(result.pass).toBe(true);
    expect(result.line).toMatch(/PASS/);
  });

  it("reports INCONCLUSIVE rather than KILL when the harness itself broke", () => {
    // A broken harness finding nothing must not read as evidence against the thesis.
    const states = [state("cart", [], "boom"), state("checkout", [], "boom")];
    const result = verdict(analyse([v("a", "#1")], states));
    expect(result.pass).toBe(false);
    expect(result.line).toMatch(/INCONCLUSIVE/);
    expect(result.line).not.toMatch(/KILL/);
  });

  it("uses the threshold declared in advance", () => {
    expect(KILL_THRESHOLD_PCT).toBe(30);
  });
});

/**
 * Tests for the PRE-REGISTERED primary metric. Written 2026-07-15 before run 2
 * and before any run-2 data existed — the whole point of pre-registration.
 */
describe("primaryOutcome — pre-registered before run 2", () => {
  it("CRAWLER_WRONG when the entry scan is clean but deep states hold blocking violations", () => {
    // This is the saucedemo shape, and the only outcome that supports the pitch.
    const a = analyse([], [state("checkout", [v("select-name", "select")])]);
    const r = primaryOutcome(a);
    expect(r.outcome).toBe("CRAWLER_WRONG");
    expect(a.crawlerSaysClean).toBe(true);
    expect(a.crawlerVerdictWrong).toBe(true);
  });

  it("a clean entry page with only NON-blocking deep findings does NOT count as wrong", () => {
    // Guards the flattering direction: a monitor reporting "clean" is not wrong
    // just because a moderate finding exists somewhere deep.
    const a = analyse([], [state("cart", [v("region", "#x", "moderate")])]);
    expect(a.crawlerVerdictWrong).toBe(false);
    expect(primaryOutcome(a).outcome).toBe("NOTHING_HIDDEN");
  });

  it("CRAWLER_RIGHT_BUT_SHALLOW when the entry page already flags blocking issues", () => {
    // This is the the-internet shape. The monitor's verdict stands; it is not wrong.
    const a = analyse([v("color-contrast", "#hdr")], [state("cart", [v("label", "#qty")])]);
    const r = primaryOutcome(a);
    expect(r.outcome).toBe("CRAWLER_RIGHT_BUT_SHALLOW");
    expect(a.crawlerVerdictWrong).toBe(false);
  });

  it("NOTHING_HIDDEN when deep states add no blocking violations", () => {
    const a = analyse([v("label", "#a")], [state("cart", [v("label", "#a")])]);
    expect(primaryOutcome(a).outcome).toBe("NOTHING_HIDDEN");
  });

  it("INCONCLUSIVE beats CRAWLER_WRONG when the harness broke", () => {
    // A harness that reached nothing must never be read as evidence.
    const a = analyse([], [state("checkout", [], "timeout")]);
    expect(primaryOutcome(a).outcome).toBe("INCONCLUSIVE");
  });

  it("reports the absolute count, because a true pitch at tiny scale is still thin", () => {
    const a = analyse([], [state("cart", [v("label", "#a"), v("label", "#b")])]);
    expect(a.netNewBlockingCount).toBe(2);
  });
});
