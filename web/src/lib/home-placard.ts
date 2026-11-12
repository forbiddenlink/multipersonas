import { computeGrade } from "@engine/grader/score";
import { PROBE_LEDGER } from "@/lib/probe-ledger";

/**
 * The letter on the home page placard, computed by the engine's own scorer from the probe
 * ledger's public-scan result for saucedemo.com. The ledger records violation counts, not
 * how many checks passed. When nothing failed, the score is 100 for any positive pass count,
 * so one is used here; it never reaches the page. A public scan with any issues returns
 * null: the ledger has no per-impact breakdown to grade from, and the page then shows the
 * count with no letter rather than a letter the engine did not compute.
 */
export function publicScanLetter(row: (typeof PROBE_LEDGER)[number]): "A" | "B" | "C" | "D" | "F" | null {
  if (row.publicScan !== 0) return null;
  const report = computeGrade([
    {
      url: `https://${row.host}/`,
      violationsByImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      passCount: 1,
      wcagAAViolations: 0,
    },
  ]);
  return report.grade;
}
