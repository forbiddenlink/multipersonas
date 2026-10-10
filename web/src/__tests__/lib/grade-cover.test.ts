import { describe, expect, it } from "vitest";
import { computeGrade, type GradeReport, type PageAxe } from "@engine/grader/score";
import { gradeArithmetic } from "@/lib/grade-arithmetic";
import { gradeOutcomes, pagesReached, scannedAtUtc } from "@/lib/grade-cover";

const page = (url: string, passCount: number, nodes: number): PageAxe => ({
  url,
  passCount,
  violationsByImpact: { critical: 0, serious: nodes, moderate: 0, minor: 0 },
  wcagAAViolations: nodes,
  rules: nodes
    ? [{ id: "color-contrast", impact: "serious", nodes, help: "h", wcagAA: true }]
    : [],
});

describe("scannedAtUtc", () => {
  it("prints minute-level UTC", () => {
    expect(scannedAtUtc("2026-10-10T14:32:55.123Z")).toBe("2026-10-10 14:32 UTC");
  });
  it("does not print Invalid Date", () => {
    expect(scannedAtUtc("nope")).toBe("unknown time");
  });
});

describe("pagesReached", () => {
  it("shows pages against the limit when the report has one", () => {
    expect(pagesReached({ pagesScanned: 7, coverage: { pageLimit: 10, skippedPages: 1 } })).toBe("7 of 10");
  });
  it("shows the bare count for older reports", () => {
    expect(pagesReached({ pagesScanned: 3 })).toBe("3");
  });
});

describe("gradeArithmetic", () => {
  it("recomputes the stored score from the page scores", () => {
    const report = computeGrade([page("a", 90, 5), page("b", 100, 0), page("c", 40, 10)]);
    const math = gradeArithmetic(report);
    expect(math.pageScores).toEqual(report.perPage.map((p) => p.score));
    expect(math.mean).toBe(report.score);
    expect(math.reproduces).toBe(true);
  });

  it("flags a stored score the page scores do not reproduce", () => {
    const report: GradeReport = { ...computeGrade([page("a", 90, 5)]), score: 99 };
    expect(gradeArithmetic(report).reproduces).toBe(false);
  });

  it("does not claim to reproduce an empty report", () => {
    expect(gradeArithmetic(computeGrade([])).reproduces).toBe(false);
  });

  it("lists the grader's own weights and bands", () => {
    const math = gradeArithmetic(computeGrade([page("a", 90, 0)]));
    expect(math.weights).toEqual([
      { impact: "critical", weight: 4 },
      { impact: "serious", weight: 2 },
      { impact: "moderate", weight: 1 },
      { impact: "minor", weight: 0.5 },
    ]);
    expect(math.bands.map((b) => `${b.grade} ${b.label}`)).toEqual([
      "A 95 to 100",
      "B 85 to 94",
      "C 70 to 84",
      "D 50 to 69",
      "F 0 to 49",
    ]);
  });
});

describe("gradeOutcomes", () => {
  it("states a clean WCAG result in words, not only a colour", () => {
    const report = computeGrade([page("a", 90, 0)]);
    const wcag = gradeOutcomes(report).find((o) => o.id === "wcag");
    expect(wcag).toMatchObject({ tone: "pass", glyph: "✓" });
    expect(wcag?.label).toMatch(/No WCAG A\/AA failures detected/);
  });

  it("counts failing rules and elements", () => {
    const report = computeGrade([page("a", 90, 5)]);
    const wcag = gradeOutcomes(report).find((o) => o.id === "wcag");
    expect(wcag).toMatchObject({ tone: "fail", glyph: "■" });
    expect(wcag?.label).toBe("1 WCAG A/AA rule failed on 5 elements");
  });

  it("does not turn a missing manual-check count into zero", () => {
    const report = computeGrade([page("a", 90, 0)]);
    expect(gradeOutcomes(report).find((o) => o.id === "manual")?.label).toMatch(/not recorded/);
    const recorded = gradeOutcomes({ ...report, needsReview: 1 }).find((o) => o.id === "manual");
    expect(recorded?.label).toBe("1 element needs a manual check");
  });

  it("always lists what was not tested and never uses a banned claim word", () => {
    const outcomes = gradeOutcomes(computeGrade([page("a", 90, 3)]));
    expect(outcomes.some((o) => o.id === "untested")).toBe(true);
    for (const o of outcomes) expect(o.label).not.toMatch(/complian|conformant|passes WCAG/i);
  });
});
