import { splitLocations } from "@/lib/report";
import { SEVERITY_ORDER } from "@/components/forensic/severity";

export interface PriorityInput {
  id: string;
  ruleId: string | null;
  title: string;
  severity: string;
  priorityScore: number;
  priorityReason: string;
  /** Page_url as stored (possibly comma-joined) or already split. */
  locations: string[];
}

export interface PriorityGroup {
  key: string;
  ruleId: string | null;
  title: string;
  /** Most severe severity among the grouped findings. */
  severity: string;
  /** Best member score; the per-finding scoring is unchanged. */
  priorityScore: number;
  priorityReason: string;
  /** Findings of this rule. */
  issues: number;
  /** Distinct pages/states the rule appears on. */
  pages: number;
}

function rank(severity: string): number {
  const i = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

/**
 * Fix-first list: one entry per rule, so the top N are N different problems rather than
 * the same rule repeated for each page or state it was seen on. Order is by best score;
 * ties keep input order.
 */
export function groupPriority(items: readonly PriorityInput[], limit = 3): PriorityGroup[] {
  const groups = new Map<string, PriorityGroup & { pageSet: Set<string> }>();
  for (const it of items) {
    const key = it.ruleId ?? it.title;
    const locs = it.locations.flatMap((l) => splitLocations(l));
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        key,
        ruleId: it.ruleId,
        title: it.title,
        severity: it.severity,
        priorityScore: it.priorityScore,
        priorityReason: it.priorityReason,
        issues: 1,
        pages: 0,
        pageSet: new Set(locs),
      });
      continue;
    }
    g.issues += 1;
    for (const l of locs) g.pageSet.add(l);
    if (rank(it.severity) < rank(g.severity)) g.severity = it.severity;
    if (it.priorityScore > g.priorityScore) {
      g.priorityScore = it.priorityScore;
      g.priorityReason = it.priorityReason;
    }
  }
  return [...groups.values()]
    .map(({ pageSet, ...g }) => ({ ...g, pages: pageSet.size }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}
