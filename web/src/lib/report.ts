import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { wcagTagsToCriteria, type Criterion } from "./wcag";

type SB = SupabaseClient<Database>;

const SEVERITY_ORDER = ["critical", "serious", "moderate", "minor"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

/** The finding columns the report reads. Kept narrow — the report is verdicts-only. */
export interface FindingRow {
  id: string;
  source: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  rule_id: string | null;
  wcag_tags: string[] | null;
}

interface RunRow {
  id: string;
  url: string;
  created_at: string;
  persona_ids: string[];
}

export interface ReportVerdict {
  id: string;
  title: string;
  ruleId: string | null;
  severity: string;
  criteria: Criterion[];
  description: string;
  recommendation: string;
}

export interface ReportData {
  runId: string;
  url: string;
  auditDate: string;
  personaIds: string[];
  severityCounts: Record<Severity, number>;
  verdicts: ReportVerdict[];
}

function severityRank(severity: string): number {
  const i = (SEVERITY_ORDER as readonly string[]).indexOf(severity);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

/**
 * Pure assembly of a report from a run + its findings. The compliance hard wall lives
 * here: only `source === 'axe'` findings become verdicts, so a persona opinion can never
 * enter the report even if a caller passed one in. (buildReport also filters at the query,
 * belt-and-suspenders.) Verdicts are sorted most-severe first.
 */
export function assembleReport(run: RunRow, rows: FindingRow[]): ReportData {
  const verdicts: ReportVerdict[] = rows
    .filter((f) => f.source === "axe")
    .map((f) => ({
      id: f.id,
      title: f.title,
      ruleId: f.rule_id,
      severity: f.severity,
      criteria: wcagTagsToCriteria(f.wcag_tags),
      description: f.description,
      recommendation: f.recommendation,
    }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const severityCounts = SEVERITY_ORDER.reduce(
    (acc, s) => {
      acc[s] = verdicts.filter((v) => v.severity === s).length;
      return acc;
    },
    {} as Record<Severity, number>,
  );

  return {
    runId: run.id,
    url: run.url,
    auditDate: run.created_at,
    personaIds: run.persona_ids,
    severityCounts,
    verdicts,
  };
}

/**
 * Fetch a run and its axe verdicts, scoped to the caller by RLS. Returns null when the run
 * does not exist or is not the caller's — the route turns that into a 404.
 */
export async function buildReport(supabase: SB, id: string): Promise<ReportData | null> {
  const { data: run } = await supabase
    .from("test_runs")
    .select("id,url,created_at,persona_ids")
    .eq("id", id)
    .single();
  if (!run) return null;

  const { data: findingRows } = await supabase
    .from("findings")
    .select("id,source,severity,title,description,recommendation,rule_id,wcag_tags")
    .eq("test_run_id", run.id)
    .eq("source", "axe");

  return assembleReport(run, findingRows ?? []);
}
