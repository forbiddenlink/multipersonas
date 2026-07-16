import { describe, it, expect } from "vitest";
import { compare, verdictFor, defectKey, KILL_BELOW_PCT, STRONG_ABOVE_PCT } from "./compare.js";
import type { Finding } from "../../src/agent/engine.js";

/**
 * The comparison is tested against known inputs BEFORE it sees real data, so a
 * disappointing result cannot be blamed on arithmetic and a flattering one
 * cannot be produced by it.
 */
const d = (ruleId: string, target: string, url = "https://x.test/"): Finding => ({
  severity: "serious", category: "accessibility", title: ruleId, description: "",
  recommendation: "", pageUrl: url, ruleId, target, seenOn: [url],
});

describe("defect identity", () => {
  it("is rule + element, not page — one nav bug on ten pages is one defect", () => {
    expect(defectKey(d("link-name", "a.logo", "https://x.test/a")))
      .toBe(defectKey(d("link-name", "a.logo", "https://x.test/b")));
  });

  it("separates different rules and different elements", () => {
    expect(defectKey(d("link-name", "a.logo"))).not.toBe(defectKey(d("color-contrast", "a.logo")));
    expect(defectKey(d("link-name", "a.logo"))).not.toBe(defectKey(d("link-name", "a.tos")));
  });
});

describe("pre-registered thresholds", () => {
  it("kills below 15 and calls strong above 40", () => {
    expect(verdictFor(0)).toBe("KILL_DIFFERENTIATOR");
    expect(verdictFor(KILL_BELOW_PCT - 0.01)).toBe("KILL_DIFFERENTIATOR");
    expect(verdictFor(KILL_BELOW_PCT)).toBe("WEAK_SUPPORT");
    expect(verdictFor(STRONG_ABOVE_PCT)).toBe("WEAK_SUPPORT");
    expect(verdictFor(STRONG_ABOVE_PCT + 0.01)).toBe("STRONG_SUPPORT");
  });
});

describe("compare", () => {
  it("reports 0% net-new when the crawler found everything the personas did", () => {
    const both = [d("a", "1"), d("b", "2")];
    const c = compare(both, both, ["https://x.test/"], ["https://x.test/"]);
    expect(c.netNewPct).toBe(0);
    expect(c.verdict).toBe("KILL_DIFFERENTIATOR");
    expect(c.personasOnly).toEqual([]);
  });

  it("reports 100% when the crawler found nothing the personas did", () => {
    const c = compare([d("a", "1")], [], ["https://x.test/"], []);
    expect(c.netNewPct).toBe(100);
    expect(c.verdict).toBe("STRONG_SUPPORT");
  });

  it("computes net-new over the union, not over the personas' own total", () => {
    // P={a,b,c} C={c,d}. union=4, personasOnly={a,b} -> 50%.
    const c = compare(
      [d("a", "1"), d("b", "2"), d("c", "3")],
      [d("c", "3"), d("dd", "4")],
      [], [],
    );
    expect(c.personasOnly.sort()).toEqual(["a|1", "b|2"]);
    expect(c.crawlerOnly).toEqual(["dd|4"]);
    expect(c.shared).toEqual(["c|3"]);
    expect(c.netNewPct).toBe(50);
  });

  it("surfaces crawlerOnly — personas missing things is evidence too", () => {
    const c = compare([d("a", "1")], [d("a", "1"), d("b", "2"), d("c", "3")], [], []);
    expect(c.crawlerOnly.sort()).toEqual(["b|2", "c|3"]);
    expect(c.verdict).toBe("KILL_DIFFERENTIATOR");
  });

  it("counts states the personas reached that the crawler never did", () => {
    const c = compare([], [],
      ["https://x.test/", "https://x.test/dash?filter=x"],
      ["https://x.test/"],
    );
    expect(c.statesOnlyPersonas).toEqual(["https://x.test/dash?filter=x"]);
    expect(c.personaStates).toBe(2);
    expect(c.crawlerStates).toBe(1);
  });

  it("treats a trailing slash and a fragment as the same state", () => {
    const c = compare([], [], ["https://x.test/a/", "https://x.test/a#top"], ["https://x.test/a"]);
    expect(c.statesOnlyPersonas).toEqual([]);
  });

  it("does not divide by zero when neither arm found anything", () => {
    const c = compare([], [], [], []);
    expect(c.netNewPct).toBe(0);
  });
});
