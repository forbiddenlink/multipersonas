// Pure, honest grading of a public-page axe scan. No I/O — unit-testable.
//
// The grade is a real ratio (passed-check weight over total weight), not a
// fabricated composite. A prior 0-100 composite was removed because it always
// floored to 0 on real sites; this one derives from axe's own pass/fail counts
// and is reported beside a traceable per-impact table so nothing is invented.
//
// Only WCAG 2.x A/AA findings move the letter. axe best-practice rules are real
// defects and stay listed, but counting them graded sparse, conformant pages a D
// (example.com: 0 WCAG failures, 3 best-practice rules, 53/100).

import { SEVERITIES, type Severity } from "../domain/vocab.js";

export type Impact = Severity;

/** Deque's documented severity weights. */
export const IMPACT_WEIGHT: Record<Impact, number> = {
  critical: 4,
  serious: 2,
  moderate: 1,
  minor: 0.5,
};

/** Most located elements kept per rule. Enough to find the pattern, small enough to store. */
export const MAX_RULE_EXAMPLES = 3;

/** One element axe flagged for a rule: where it is and what it looks like. */
export interface GradeNodeExample {
  /** Page the element was found on. */
  url: string;
  /** axe's CSS selector for the element; shadow-DOM hops joined with " >>> ". */
  target: string;
  /** The element's opening HTML as axe reported it, capped in length. */
  html: string;
}

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
  /** Up to MAX_RULE_EXAMPLES located elements. Absent on reports stored before examples. */
  examples?: GradeNodeExample[];
  /** Pages this rule fired on. Set when aggregated; absent on reports stored before this field. */
  pages?: number;
  /**
   * The selector that repeats on the most pages, when one repeats on 2+. It marks a shared
   * component (nav, footer, header), so one fix clears every page. Aggregated reports only.
   */
  sharedTarget?: { target: string; pages: number };
  /**
   * Every selector axe flagged on ONE page (capped by the scanner). Input to the
   * cross-page aggregation; it is never stored on the aggregated report.
   */
  targets?: string[];
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
  /**
   * Elements axe could not decide either way ("incomplete"): a person has to look.
   * Absent on pages scanned before this field.
   */
  incompleteNodes?: number;
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
  /** Violating nodes from axe best-practice rules (not WCAG success criteria). */
  bestPracticeViolations?: number;
  /**
   * Elements axe flagged as needing a human check, summed across pages. Absent on reports
   * stored before this field, which is not the same as zero.
   */
  needsReview?: number;
  /** "wcag-a-aa" when only WCAG A/AA findings drove the score. Absent on older reports. */
  scoring?: "wcag-a-aa";
  perPage: { url: string; score: number; violations: number; wcagViolations?: number }[];
  /** Aggregated rule hits, most nodes first. Empty on older stored reports. */
  rules: GradeRuleHit[];
}

const IMPACTS: Impact[] = [...SEVERITIES];

/** Lowest score that earns each letter, best first. Anything below the last band is an F. */
export const GRADE_BANDS: readonly { grade: GradeReport["grade"]; min: number }[] = [
  { grade: "A", min: 95 },
  { grade: "B", min: 85 },
  { grade: "C", min: 70 },
  { grade: "D", min: 50 },
];

function bandFor(score: number): GradeReport["grade"] {
  return GRADE_BANDS.find((b) => score >= b.min)?.grade ?? "F";
}

/**
 * Weight of the WCAG A/AA violations on a page. Uses per-rule hits when present;
 * older fixtures without rules fall back to every violation (the prior behaviour).
 */
function wcagViolationWeight(p: PageAxe): number {
  if (p.rules) {
    return p.rules
      .filter((r) => r.wcagAA)
      .reduce((sum, r) => sum + r.nodes * IMPACT_WEIGHT[r.impact], 0);
  }
  return IMPACTS.reduce((sum, i) => sum + p.violationsByImpact[i] * IMPACT_WEIGHT[i], 0);
}

function pageScore(p: PageAxe): number {
  const violationWeight = wcagViolationWeight(p);
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
    wcagViolations: p.wcagAAViolations,
  }));

  const score = Math.round(
    perPage.reduce((s, p) => s + p.score, 0) / perPage.length,
  );

  const byImpact = IMPACTS.reduce(
    (acc, i) => ({ ...acc, [i]: pages.reduce((s, p) => s + p.violationsByImpact[i], 0) }),
    {} as Record<Impact, number>,
  );

  // Merge per-page rule hits by id (sum nodes; keep highest impact / first help).
  // Side tables count pages and repeating selectors; a repeat across pages points at one
  // shared component, so the aggregate keeps only the winner, never the whole selector list.
  const byRule = new Map<string, GradeRuleHit>();
  const targetPages = new Map<string, Map<string, number>>();
  for (const p of pages) {
    for (const { targets, ...hit } of p.rules ?? []) {
      const seenHere = new Set(targets ?? []);
      if (seenHere.size > 0) {
        const counts = targetPages.get(hit.id) ?? new Map<string, number>();
        for (const t of seenHere) counts.set(t, (counts.get(t) ?? 0) + 1);
        targetPages.set(hit.id, counts);
      }
      const prev = byRule.get(hit.id);
      if (!prev) {
        byRule.set(hit.id, {
          ...hit,
          pages: 1,
          ...(hit.examples ? { examples: hit.examples.slice(0, MAX_RULE_EXAMPLES) } : {}),
        });
        continue;
      }
      prev.nodes += hit.nodes;
      prev.pages = (prev.pages ?? 1) + 1;
      if (hit.examples?.length) {
        prev.examples = [...(prev.examples ?? []), ...hit.examples].slice(0, MAX_RULE_EXAMPLES);
      }
      prev.wcagAA = prev.wcagAA || hit.wcagAA;
      if (IMPACTS.indexOf(hit.impact) < IMPACTS.indexOf(prev.impact)) {
        prev.impact = hit.impact;
      }
    }
  }
  for (const [id, counts] of targetPages) {
    let best: { target: string; pages: number } | undefined;
    for (const [target, n] of counts) {
      if (n >= 2 && (!best || n > best.pages)) best = { target, pages: n };
    }
    if (best) byRule.get(id)!.sharedTarget = best;
  }
  const rules = [...byRule.values()].sort((a, b) => {
    const impactDelta = IMPACTS.indexOf(a.impact) - IMPACTS.indexOf(b.impact);
    if (impactDelta !== 0) return impactDelta;
    return b.nodes - a.nodes;
  });

  const totalViolations = perPage.reduce((s, p) => s + p.violations, 0);
  const wcagAAViolations = pages.reduce((s, p) => s + p.wcagAAViolations, 0);

  const recorded = pages.filter((p) => typeof p.incompleteNodes === "number");

  return {
    grade: bandFor(score),
    score,
    pagesScanned: pages.length,
    totalViolations,
    byImpact,
    wcagAAViolations,
    bestPracticeViolations: totalViolations - wcagAAViolations,
    ...(recorded.length > 0
      ? { needsReview: recorded.reduce((n, p) => n + (p.incompleteNodes ?? 0), 0) }
      : {}),
    scoring: "wcag-a-aa",
    perPage,
    rules,
  };
}
