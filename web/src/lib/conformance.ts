import type { Criterion } from "./wcag";

/**
 * The conformance engine. Turns axe verdicts into an honest, automated ACR/VPAT-lite
 * conformance table. See docs/plans/2026-07-30-honest-acr-design.md.
 *
 * The one rule that makes this credible (and legally defensible) rather than the
 * accessiBe failure mode: automation ALONE never emits a bare "Supports". A criterion
 * axe checks and finds clean is "Partially Supports" (the manual portion is untested); a
 * criterion axe can't check at all is "Needs Manual Review". Only a real violation yields
 * "Does Not Support". Pure function, unit-tested independently of the catalog data.
 */

export type ConformanceLevel = "A" | "AA";
export type ConformanceStatus =
  | "does-not-support"
  | "partially-supports"
  | "needs-manual-review";

export interface CatalogCriterion {
  code: string;
  level: ConformanceLevel;
  name: string;
}

export interface ConformanceRow {
  code: string;
  name: string;
  level: ConformanceLevel;
  status: ConformanceStatus;
  /** Number of distinct verdicts (axe violations) that map to this criterion. */
  violationCount: number;
  /** Honest, human-readable remark matching the status. */
  remarks: string;
}

export interface ConformanceSummary {
  rows: ConformanceRow[];
  counts: Record<ConformanceStatus, number>;
  totalCriteria: number;
}

const REMARK: Record<ConformanceStatus, string> = {
  "does-not-support": "Automated testing found violations of this criterion. See the findings below.",
  "partially-supports":
    "Automated checks pass. Portions of this criterion still require manual verification.",
  "needs-manual-review": "No automated coverage. This criterion requires manual review.",
};

/**
 * @param verdicts    the report's axe verdicts (each carries the WCAG criteria it violates)
 * @param catalog     the full WCAG catalog to report against (e.g. all 2.2 A+AA)
 * @param axeTestable the SC codes axe-core can actually test (wcag.AXE_TESTABLE_CODES)
 */
export function buildConformance(
  verdicts: ReadonlyArray<{ criteria: Criterion[] }>,
  catalog: readonly CatalogCriterion[],
  axeTestable: ReadonlySet<string>,
): ConformanceSummary {
  // How many verdicts touch each SC code.
  const violationCounts = new Map<string, number>();
  for (const verdict of verdicts) {
    // A single verdict can cite multiple criteria; count it once per criterion.
    const seen = new Set<string>();
    for (const c of verdict.criteria) {
      if (seen.has(c.code)) continue;
      seen.add(c.code);
      violationCounts.set(c.code, (violationCounts.get(c.code) ?? 0) + 1);
    }
  }

  const counts: Record<ConformanceStatus, number> = {
    "does-not-support": 0,
    "partially-supports": 0,
    "needs-manual-review": 0,
  };

  const rows: ConformanceRow[] = catalog.map((sc) => {
    const violationCount = violationCounts.get(sc.code) ?? 0;
    let status: ConformanceStatus;
    if (violationCount > 0) status = "does-not-support";
    else if (axeTestable.has(sc.code)) status = "partially-supports";
    else status = "needs-manual-review";

    counts[status] += 1;
    return {
      code: sc.code,
      name: sc.name,
      level: sc.level,
      status,
      violationCount,
      remarks: REMARK[status],
    };
  });

  return { rows, counts, totalCriteria: catalog.length };
}
