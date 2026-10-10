import { createRequire } from "node:module";
import type { Finding } from "../agent/engine.js";
import { defectKey } from "../agent/defect-key.js";
import type { Severity } from "../domain/vocab.js";

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
  /** True when the key is absent from the baseline (every defect is new without one). */
  isNew: boolean;
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
  summary: { total: number; new: number; fixed: number; stillOpen: number };
  defects: ScanJsonDefect[];
  /** Baseline keys that no longer appear. */
  fixed: string[];
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
  now?: Date;
}

export function buildScanJson(i: BuildScanJsonInput): ScanJson {
  const defects: ScanJsonDefect[] = i.findings.map((f) => {
    const key = defectKey(f);
    return {
      key,
      ruleId: f.ruleId ?? f.title,
      impact: f.severity,
      help: f.title,
      wcagTags: (f.wcagTags ?? []).filter((t) => /^wcag\d+$/.test(t)),
      selector: f.target ?? "",
      states: f.seenOn ?? [f.pageUrl],
      isNew: !i.baselineKeys?.has(key),
    };
  });
  const newCount = defects.filter((d) => d.isNew).length;
  return {
    schemaVersion: SCAN_JSON_VERSION,
    tool: { name: "personaudit", version: i.version },
    axeCoreVersion: axeCoreVersion(),
    target: i.url,
    timestamp: (i.now ?? new Date()).toISOString(),
    states: { scanned: i.pagesVisited, skipped: i.skipped },
    baseline: i.baselineKeys ? (i.baselinePath ?? null) : null,
    summary: { total: defects.length, new: newCount, fixed: i.fixed.length, stillOpen: defects.length - newCount },
    defects,
    fixed: i.fixed,
  };
}
