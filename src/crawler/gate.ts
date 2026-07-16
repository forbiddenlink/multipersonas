import type { Finding } from "../agent/engine.js";
import { defectKey } from "../agent/defect-key.js";

/**
 * CI gating for scan.
 *
 * A scan is only a product if it can fail a build. But failing on the whole
 * existing backlog on day one is useless — nobody adopts a gate that is red from
 * the first commit. So the gate works against a baseline: it fails only on
 * defects that are NEW relative to a saved snapshot, at or above a severity
 * threshold.
 *
 * Deterministic and keyless (scan runs with no ANTHROPIC_API_KEY), so this is
 * safe to run on every pull request.
 */

export type Severity = "critical" | "serious" | "moderate" | "minor";

const SEVERITY_ORDER: Severity[] = ["minor", "moderate", "serious", "critical"];

/** True if `sev` is at least as severe as `threshold`. */
export function severityAtLeast(sev: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER.indexOf(sev) >= SEVERITY_ORDER.indexOf(threshold);
}

/** A baseline is the set of defect keys already known and accepted. */
export interface Baseline {
  createdAt?: string;
  url?: string;
  keys: string[];
}

export function baselineFromFindings(findings: Finding[], meta: { url?: string; createdAt?: string } = {}): Baseline {
  return {
    ...meta,
    keys: [...new Set(findings.map((f) => defectKey(f)))].sort(),
  };
}

export interface GateResult {
  /** Defects not present in the baseline. */
  newDefects: Finding[];
  /** New defects at or above the threshold — the ones that fail the build. */
  failing: Finding[];
  /** Defects in the baseline that are no longer present — worth celebrating, never fails. */
  fixed: string[];
  passed: boolean;
  /** 0 pass, 2 gate failed. (1 is reserved for usage/runtime errors elsewhere.) */
  exitCode: 0 | 2;
}

/**
 * Decide the gate.
 *
 * With no baseline, every current defect is "new" — correct for a first run that
 * establishes the snapshot, and the reason --update-baseline exists.
 */
export function evaluateGate(
  findings: Finding[],
  options: { failOn: Severity; baseline?: Baseline | null },
): GateResult {
  const baselineKeys = new Set(options.baseline?.keys ?? []);
  const currentKeys = new Set(findings.map((f) => defectKey(f)));

  const newDefects = findings.filter((f) => !baselineKeys.has(defectKey(f)));
  const failing = newDefects.filter((f) => severityAtLeast(f.severity, options.failOn));
  const fixed = [...baselineKeys].filter((k) => !currentKeys.has(k));

  const passed = failing.length === 0;
  return { newDefects, failing, fixed, passed, exitCode: passed ? 0 : 2 };
}
