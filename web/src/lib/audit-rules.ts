import { SEVERITY_ORDER } from "@/components/forensic/severity";
import { splitLocations } from "@/lib/report";

export interface RuleGroupInput {
  rule_id: string | null;
  title: string;
  severity: string;
  page_url: string | null;
}

export interface RuleGroup {
  /** axe rule id, or the finding title for pre-migration rows that carry none. */
  key: string;
  title: string;
  /** Most severe severity seen for this rule. */
  severity: string;
  /** Number of findings (distinct defects) under this rule. */
  count: number;
  /** Distinct pages the rule was seen on. */
  pages: number;
}

// Unknown/legacy severities sort last, mirroring the audit page and lib/report.ts.
function rank(severity: string): number {
  const i = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

/** Roll axe findings up by rule: how many defects and how many pages each rule touches. */
export function groupFindingsByRule(findings: readonly RuleGroupInput[]): RuleGroup[] {
  const groups = new Map<string, RuleGroup & { pageSet: Set<string> }>();
  for (const f of findings) {
    const key = f.rule_id ?? f.title;
    const existing = groups.get(key);
    const locations = splitLocations(f.page_url);
    if (!existing) {
      groups.set(key, {
        key,
        title: f.title,
        severity: f.severity,
        count: 1,
        pages: 0,
        pageSet: new Set(locations),
      });
      continue;
    }
    existing.count += 1;
    for (const l of locations) existing.pageSet.add(l);
    if (rank(f.severity) < rank(existing.severity)) existing.severity = f.severity;
  }
  return [...groups.values()]
    .map(({ pageSet, ...g }) => ({ ...g, pages: pageSet.size }))
    .sort((a, b) => rank(a.severity) - rank(b.severity) || b.count - a.count || a.key.localeCompare(b.key));
}
