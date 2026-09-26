import { SEVERITIES, isSeverity, type Severity } from "@engine/domain/vocab";

export type TrendRun = { id: string; created_at: string };
export type TrendFinding = { test_run_id: string; severity: string | null };

export type FindingsTrendRow = {
  runId: string;
  createdAt: string;
  counts: Record<Severity, number>;
  total: number;
  /** Total minus the previous run's total; null for the first run. */
  change: number | null;
};

/**
 * Axe findings detected in each completed run of a project, oldest first, so an agency
 * can show a client the backlog shrinking across retests. Counts what each run found,
 * regardless of workflow status: status is a decision about a finding, not a new scan.
 */
export function buildFindingsTrend(runs: TrendRun[], findings: TrendFinding[]): FindingsTrendRow[] {
  const ordered = [...runs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let previous: number | null = null;

  return ordered.map((run) => {
    const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
    for (const finding of findings) {
      if (finding.test_run_id !== run.id) continue;
      counts[isSeverity(finding.severity ?? "") ? (finding.severity as Severity) : "minor"] += 1;
    }
    const total = SEVERITIES.reduce((sum, s) => sum + counts[s], 0);
    const change = previous === null ? null : total - previous;
    previous = total;
    return { runId: run.id, createdAt: run.created_at, counts, total, change };
  });
}
