import { describe, it, expect } from "vitest";
import { computeGrade, IMPACT_WEIGHT, type PageAxe } from "./score.js";

const emptyImpacts = { critical: 0, serious: 0, moderate: 0, minor: 0 };

describe("computeGrade", () => {
  it("gives a clean page an A (all passes, no violations)", () => {
    const pages: PageAxe[] = [
      { url: "https://x.test/", violationsByImpact: { ...emptyImpacts }, passCount: 40, wcagAAViolations: 0 },
    ];
    const r = computeGrade(pages);
    expect(r.grade).toBe("A");
    expect(r.score).toBe(100);
    expect(r.totalViolations).toBe(0);
  });

  it("weights criticals 8x heavier than minors", () => {
    const withCritical = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, critical: 1 }, passCount: 10, wcagAAViolations: 1 },
    ]);
    const withMinor = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, minor: 1 }, passCount: 10, wcagAAViolations: 0 },
    ]);
    expect(withCritical.score).toBeLessThan(withMinor.score);
    expect(IMPACT_WEIGHT.critical / IMPACT_WEIGHT.minor).toBe(8);
  });

  it("score is passWeight/(passWeight+violationWeight)*100", () => {
    // passCount 10 (weight 10), 1 serious (weight 2) -> 10/12 = 83.33 -> 83
    const r = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, serious: 1 }, passCount: 10, wcagAAViolations: 1 },
    ]);
    expect(r.score).toBe(83);
    expect(r.grade).toBe("C"); // 83 is in [70,85)
  });

  it("site score is the mean of per-page scores, not violation-count weighted", () => {
    const r = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts }, passCount: 10, wcagAAViolations: 0 }, // 100
      { url: "b", violationsByImpact: { ...emptyImpacts, critical: 10 }, passCount: 10, wcagAAViolations: 10 }, // 10/(10+40)=20
    ]);
    expect(r.score).toBe(60); // (100+20)/2
    expect(r.pagesScanned).toBe(2);
  });

  it("empty input returns F/0 without throwing", () => {
    const r = computeGrade([]);
    expect(r.grade).toBe("F");
    expect(r.score).toBe(0);
  });
});
