import { createRequire } from "node:module";
import type { Finding } from "../agent/engine.js";
import { defectKey } from "../agent/defect-key.js";
import type { Severity } from "../domain/vocab.js";
import type { Suppression, SuppressionOutcome } from "../crawler/suppressions.js";

/** Bumped on any breaking change to the shape below. */
export const SCAN_JSON_VERSION = 1;

/** One defect: a rule on an element, merged across every state it appeared in. */
export interface ScanJsonDefect {
  /** Stable defect key (defect-key.ts): rule id + normalized selector. */
  key: string;
  ruleId: string;
  impact: Severity;
  help: string;
  /** WCAG success-criteria tags only (e.g. "wcag143"), not axe's category tags. */
  wcagTags: string[];
  selector: string;
  /** Every state the defect was seen in. */
  states: string[];
  /** True when the key is absent from the baseline (every defect is new without one) and not suppressed. */
  isNew: boolean;
  /** True when an unexpired suppression hides this defect from the gate (status "accepted-risk" in the web app). */
  suppressed: boolean;
}

export interface ScanJson {
  schemaVersion: typeof SCAN_JSON_VERSION;
  tool: { name: "personaudit"; version: string };
  axeCoreVersion: string;
  target: string;
  timestamp: string;
  states: { scanned: string[]; skipped: string[] };
  /** Baseline file used for the new/fixed split, or null when none was loaded. */
  baseline: string | null;
  summary: { total: number; new: number; fixed: number; stillOpen: number; suppressed: number; expired: number };
  defects: ScanJsonDefect[];
  /** Baseline keys that no longer appear. */
  fixed: string[];
  /** Suppressions by outcome. `expired` ones fail the gate; `unmatched` ones are warnings. */
  suppressions: { active: Suppression[]; expired: Suppression[]; unmatched: Suppression[] };
}

/** The axe-core that @axe-core/playwright injects, which may differ from the report's host. */
export function axeCoreVersion(): string {
  try {
    const req = createRequire(import.meta.url);
    const fromPlaywright = createRequire(req.resolve("@axe-core/playwright"));
    return (fromPlaywright("axe-core/package.json") as { version: string }).version;
  } catch {
    return "unknown";
  }
}

export interface BuildScanJsonInput {
  url: string;
  version: string;
  findings: Finding[];
  pagesVisited: string[];
  skipped: string[];
  /** Keys in the baseline, or null when no baseline was loaded. */
  baselineKeys: Set<string> | null;
  baselinePath?: string;
  fixed: string[];
  suppressions?: SuppressionOutcome;
  now?: Date;
}

export function buildScanJson(i: BuildScanJsonInput): ScanJson {
  const outcome = i.suppressions ?? { active: [], expired: [], unmatched: [] };
  const activeKeys = new Set(outcome.active.map((s) => s.key));
  const defects: ScanJsonDefect[] = i.findings.map((f) => {
    const key = defectKey(f);
    const suppressed = activeKeys.has(key);
    return {
      key,
      ruleId: f.ruleId ?? f.title,
      impact: f.severity,
      help: f.title,
      wcagTags: (f.wcagTags ?? []).filter((t) => /^wcag\d+$/.test(t)),
      selector: f.target ?? "",
      states: f.seenOn ?? [f.pageUrl],
      isNew: !suppressed && !i.baselineKeys?.has(key),
      suppressed,
    };
  });
  const newCount = defects.filter((d) => d.isNew).length;
  const suppressedCount = defects.filter((d) => d.suppressed).length;
  return {
    schemaVersion: SCAN_JSON_VERSION,
    tool: { name: "personaudit", version: i.version },
    axeCoreVersion: axeCoreVersion(),
    target: i.url,
    timestamp: (i.now ?? new Date()).toISOString(),
    states: { scanned: i.pagesVisited, skipped: i.skipped },
    baseline: i.baselineKeys ? (i.baselinePath ?? null) : null,
    summary: {
      total: defects.length,
      new: newCount,
      fixed: i.fixed.length,
      stillOpen: defects.length - newCount - suppressedCount,
      suppressed: suppressedCount,
      expired: outcome.expired.length,
    },
    defects,
    fixed: i.fixed,
    suppressions: outcome,
  };
}
