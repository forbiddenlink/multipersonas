// Pure, honest grading of a public-page axe scan. No I/O — unit-testable.
//
// The grade is a real ratio (passed-check weight over total weight), not a
// fabricated composite. A prior 0-100 composite was removed because it always
// floored to 0 on real sites; this one derives from axe's own pass/fail counts
// and is reported beside a traceable per-impact table so nothing is invented.

import { SEVERITIES, type Severity } from "../domain/vocab.js";

export type Impact = Severity;

/** Deque's documented severity weights. */
export const IMPACT_WEIGHT: Record<Impact, number> = {
  critical: 4,
  serious: 2,
  moderate: 1,
  minor: 0.5,
};

export interface GradeRuleHit {
  /** axe rule id, e.g. "landmark-one-main" */
  id: string;
  impact: Impact;
  /** Violating node count across pages. */
  nodes: number;
  /** axe help text (short). */
  help: string;
  /** True when tagged WCAG 2.x A/AA (any version). */
  wcagAA: boolean;
}

export interface PageAxe {
  url: string;
  /** Count of violating NODES per impact (a rule can flag many nodes). */
  violationsByImpact: Record<Impact, number>;
  /** Number of axe checks that PASSED on the page (the denominator's other half). */
  passCount: number;
  /** Violating nodes tagged WCAG 2.x A/AA — surfaced separately from the composite. */
  wcagAAViolations: number;
  /** Per-rule hits on this page (optional for older fixtures). */
  rules?: GradeRuleHit[];
}

export interface GradeReport {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number; // 0-100, rounded
  pagesScanned: number;
  /** Absent on older reports; counts discovered URLs outside the evaluated scope. */
  coverage?: { pageLimit: number; skippedPages: number };
  totalViolations: number;
  byImpact: Record<Impact, number>;
  wcagAAViolations: number;
  perPage: { url: string; score: number; violations: number }[];
  /** Aggregated rule hits, most nodes first. Empty on older stored reports. */
  rules: GradeRuleHit[];
}

const IMPACTS: Impact[] = [...SEVERITIES];

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
      rules: [],
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

  // Merge per-page rule hits by id (sum nodes; keep highest impact / first help).
  const byRule = new Map<string, GradeRuleHit>();
  for (const p of pages) {
    for (const hit of p.rules ?? []) {
      const prev = byRule.get(hit.id);
      if (!prev) {
        byRule.set(hit.id, { ...hit });
        continue;
      }
      prev.nodes += hit.nodes;
      prev.wcagAA = prev.wcagAA || hit.wcagAA;
      if (IMPACTS.indexOf(hit.impact) < IMPACTS.indexOf(prev.impact)) {
        prev.impact = hit.impact;
      }
    }
  }
  const rules = [...byRule.values()].sort((a, b) => {
    const impactDelta = IMPACTS.indexOf(a.impact) - IMPACTS.indexOf(b.impact);
    if (impactDelta !== 0) return impactDelta;
    return b.nodes - a.nodes;
  });

  return {
    grade: bandFor(score),
    score,
    pagesScanned: pages.length,
    totalViolations: perPage.reduce((s, p) => s + p.violations, 0),
    byImpact,
    wcagAAViolations: pages.reduce((s, p) => s + p.wcagAAViolations, 0),
    perPage,
    rules,
  };
}
