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
  page_url: string | null;
}

interface RunRow {
  id: string;
  url: string;
  created_at: string;
  persona_ids: string[];
  project_id?: string | null;
}

export interface ReportVerdict {
  id: string;
  title: string;
  ruleId: string | null;
  severity: string;
  criteria: Criterion[];
  description: string;
  recommendation: string;
  /** Per-state location(s) where axe saw the defect. */
  locations: string[];
}

export interface ReportData {
  runId: string;
  url: string;
  auditDate: string;
  personaIds: string[];
  severityCounts: Record<Severity, number>;
  verdicts: ReportVerdict[];
  /** Client project name when the run is linked to a project. */
  clientName: string | null;
  /** Agency display name from the caller's profile (white-label "Prepared by"). */
  agencyName: string | null;
}

function severityRank(severity: string): number {
  const i = (SEVERITY_ORDER as readonly string[]).indexOf(severity);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

/** Split a stored page_url that may be a comma-joined seenOn list into clean locations. */
export function splitLocations(pageUrl: string | null | undefined): string[] {
  if (!pageUrl) return [];
  return pageUrl
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Pure assembly of a report from a run + its findings. The compliance hard wall lives
 * here: only `source === 'axe'` findings become verdicts, so a persona opinion can never
 * enter the report even if a caller passed one in. (buildReport also filters at the query,
 * belt-and-suspenders.) Verdicts are sorted most-severe first.
 */
export function assembleReport(
  run: RunRow,
  rows: FindingRow[],
  branding: { clientName?: string | null; agencyName?: string | null } = {},
): ReportData {
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
      locations: splitLocations(f.page_url),
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
    clientName: branding.clientName ?? null,
    agencyName: branding.agencyName ?? null,
  };
}

/**
 * Fetch a run and its axe verdicts, scoped to the caller by RLS. Returns null when the run
 * does not exist or is not the caller's — the route turns that into a 404.
 * Optionally joins project name + the caller's agency_name for white-label headers.
 */
export async function buildReport(supabase: SB, id: string): Promise<ReportData | null> {
  const { data: run } = await supabase
    .from("test_runs")
    .select("id,url,created_at,persona_ids,project_id")
    .eq("id", id)
    .single();
  if (!run) return null;

  const { data: findingRows } = await supabase
    .from("findings")
    .select(
      "id,source,severity,title,description,recommendation,rule_id,wcag_tags,page_url",
    )
    .eq("test_run_id", run.id)
    .eq("source", "axe");

  let clientName: string | null = null;
  if (run.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", run.project_id)
      .single();
    clientName = project?.name ?? null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let agencyName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_name")
      .eq("id", user.id)
      .single();
    agencyName = profile?.agency_name ?? null;
  }

  return assembleReport(run, findingRows ?? [], { clientName, agencyName });
}
