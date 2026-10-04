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
    expect(r.rules).toEqual([]);
  });

  it("best-practice-only findings do not lower the letter (example.com regression)", () => {
    // A sparse page: few passing checks, three best-practice rules, zero WCAG A/AA.
    // The old composite counted every node and graded this D 53.
    const r = computeGrade([
      {
        url: "https://example.com/",
        violationsByImpact: { ...emptyImpacts, moderate: 9 },
        passCount: 10,
        wcagAAViolations: 0,
        rules: [
          { id: "landmark-one-main", impact: "moderate", nodes: 1, help: "Document should have one main landmark", wcagAA: false },
          { id: "page-has-heading-one", impact: "moderate", nodes: 1, help: "Page should contain a level-one heading", wcagAA: false },
          { id: "region", impact: "moderate", nodes: 7, help: "All page content should be contained by landmarks", wcagAA: false },
        ],
      },
    ]);
    expect(r.grade).toBe("A");
    expect(r.score).toBe(100);
    expect(r.scoring).toBe("wcag-a-aa");
    expect(r.totalViolations).toBe(9);
    expect(r.bestPracticeViolations).toBe(9);
    expect(r.wcagAAViolations).toBe(0);
  });

  it("WCAG A/AA findings still drive the score with impact weights", () => {
    // 10 passes, one serious WCAG node (weight 2) plus 5 best-practice nodes that must not count.
    const r = computeGrade([
      {
        url: "a",
        violationsByImpact: { ...emptyImpacts, serious: 1, moderate: 5 },
        passCount: 10,
        wcagAAViolations: 1,
        rules: [
          { id: "color-contrast", impact: "serious", nodes: 1, help: "Elements must meet minimum color contrast", wcagAA: true },
          { id: "region", impact: "moderate", nodes: 5, help: "All page content should be contained by landmarks", wcagAA: false },
        ],
      },
    ]);
    expect(r.score).toBe(83); // 10 / (10 + 2)
    expect(r.grade).toBe("C");
    expect(r.perPage[0]).toMatchObject({ violations: 6, wcagViolations: 1, score: 83 });
  });

  it("aggregates per-page rule hits by id", () => {
    const r = computeGrade([
      {
        url: "a",
        violationsByImpact: { ...emptyImpacts, moderate: 2 },
        passCount: 10,
        wcagAAViolations: 0,
        rules: [
          { id: "region", impact: "moderate", nodes: 1, help: "All page content must be contained by landmarks", wcagAA: false },
          { id: "landmark-one-main", impact: "moderate", nodes: 1, help: "Document should have one main landmark", wcagAA: false },
        ],
      },
      {
        url: "b",
        violationsByImpact: { ...emptyImpacts, moderate: 1 },
        passCount: 10,
        wcagAAViolations: 0,
        rules: [
          { id: "region", impact: "moderate", nodes: 1, help: "All page content must be contained by landmarks", wcagAA: false },
        ],
      },
    ]);
    expect(r.rules).toHaveLength(2);
    const region = r.rules.find((x) => x.id === "region");
    expect(region?.nodes).toBe(2);
    expect(region?.wcagAA).toBe(false);
  });
});

describe("computeGrade rule examples", () => {
  it("merges examples across pages and caps them at three per rule", () => {
    const hit = (url: string, n: number) => ({
      id: "link-name", impact: "serious" as const, nodes: n, help: "Links need names", wcagAA: true,
      examples: Array.from({ length: n }, (_, i) => ({ url, target: `a.l${i}`, html: `<a class="l${i}"></a>` })),
    });
    const r = computeGrade([
      { url: "https://x.test/", violationsByImpact: { ...emptyImpacts, serious: 2 }, passCount: 10, wcagAAViolations: 2, rules: [hit("https://x.test/", 2)] },
      { url: "https://x.test/b", violationsByImpact: { ...emptyImpacts, serious: 2 }, passCount: 10, wcagAAViolations: 2, rules: [hit("https://x.test/b", 2)] },
    ]);
    expect(r.rules).toMatchObject([{ nodes: 4 }]);
    expect(r.rules.at(0)?.examples?.map((e) => e.url)).toEqual(["https://x.test/", "https://x.test/", "https://x.test/b"]);
  });
});

