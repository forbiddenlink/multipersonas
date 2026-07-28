import { describe, it, expect } from "vitest";
import { wcagTagsToCriteria } from "./wcag";

describe("wcagTagsToCriteria", () => {
  it("maps known axe wcag tags to success criteria", () => {
    expect(wcagTagsToCriteria(["wcag143"])).toEqual([
      { code: "1.4.3", name: "Contrast (Minimum)" },
    ]);
  });

  it("drops tags it cannot map (never fabricates a criterion)", () => {
    // wcag2aa (level), best-practice, cat.* are real axe tags but not success criteria.
    expect(wcagTagsToCriteria(["wcag2aa", "best-practice", "cat.color", "wcag111"])).toEqual([
      { code: "1.1.1", name: "Non-text Content" },
    ]);
  });

  it("dedupes repeated tags", () => {
    expect(wcagTagsToCriteria(["wcag143", "wcag143"])).toEqual([
      { code: "1.4.3", name: "Contrast (Minimum)" },
    ]);
  });

  it("sorts by criterion number, not string order", () => {
    // string sort would put 1.4.11 before 1.4.3; numeric sort must not.
    const out = wcagTagsToCriteria(["wcag412", "wcag1411", "wcag143", "wcag111"]);
    expect(out.map((c) => c.code)).toEqual(["1.1.1", "1.4.3", "1.4.11", "4.1.2"]);
  });

  it("handles an empty list and null", () => {
    expect(wcagTagsToCriteria([])).toEqual([]);
    expect(wcagTagsToCriteria(null)).toEqual([]);
  });
});
