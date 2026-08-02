// Pure, honest grading of a public-page axe scan. No I/O — unit-testable.
//
// The grade is a real ratio (passed-check weight over total weight), not a
// fabricated composite. A prior 0-100 composite was removed because it always
// floored to 0 on real sites; this one derives from axe's own pass/fail counts
// and is reported beside a traceable per-impact table so nothing is invented.

export type Impact = "critical" | "serious" | "moderate" | "minor";

/** Deque's documented severity weights. */
export const IMPACT_WEIGHT: Record<Impact, number> = {
  critical: 4,
  serious: 2,
  moderate: 1,
  minor: 0.5,
};

export interface PageAxe {
  url: string;
  /** Count of violating NODES per impact (a rule can flag many nodes). */
  violationsByImpact: Record<Impact, number>;
  /** Number of axe checks that PASSED on the page (the denominator's other half). */
  passCount: number;
  /** Violating nodes tagged WCAG 2.x A/AA — surfaced separately from the composite. */
  wcagAAViolations: number;
}

export interface GradeReport {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number; // 0-100, rounded
  pagesScanned: number;
  totalViolations: number;
  byImpact: Record<Impact, number>;
  wcagAAViolations: number;
  perPage: { url: string; score: number; violations: number }[];
}

const IMPACTS: Impact[] = ["critical", "serious", "moderate", "minor"];

function bandFor(score: number): GradeReport["grade"] {
  if (score >= 95) return "A";
  if (score >= 85) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function pageScore(p: PageAxe): number {
  const violationWeight = IMPACTS.reduce(
    (sum, i) => sum + p.violationsByImpact[i] * IMPACT_WEIGHT[i],
    0,
  );
  const passWeight = p.passCount; // each passed check weighs 1
  const denom = passWeight + violationWeight;
  if (denom === 0) return 100; // nothing testable on the page -> neutral, don't penalise
  return Math.round((100 * passWeight) / denom);
}

export function computeGrade(pages: PageAxe[]): GradeReport {
  if (pages.length === 0) {
    return {
      grade: "F",
      score: 0,
      pagesScanned: 0,
      totalViolations: 0,
      byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      wcagAAViolations: 0,
      perPage: [],
    };
  }

  const perPage = pages.map((p) => ({
    url: p.url,
    score: pageScore(p),
    violations: IMPACTS.reduce((s, i) => s + p.violationsByImpact[i], 0),
  }));

  const score = Math.round(
    perPage.reduce((s, p) => s + p.score, 0) / perPage.length,
  );

  const byImpact = IMPACTS.reduce(
    (acc, i) => ({ ...acc, [i]: pages.reduce((s, p) => s + p.violationsByImpact[i], 0) }),
    {} as Record<Impact, number>,
  );

  return {
    grade: bandFor(score),
    score,
    pagesScanned: pages.length,
    totalViolations: perPage.reduce((s, p) => s + p.violations, 0),
    byImpact,
    wcagAAViolations: pages.reduce((s, p) => s + p.wcagAAViolations, 0),
    perPage,
  };
}
