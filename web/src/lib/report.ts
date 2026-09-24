import "server-only";
import { parseTaskDefinition, parseTaskOutcomes, type TaskOutcome, type TaskDefinition } from "@engine/tasks/definition";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { wcagTagsToCriteria, AXE_TESTABLE_CODES, type Criterion } from "./wcag";
import { buildConformance, type ConformanceSummary } from "./conformance";
import { WCAG22_AA_CATALOG } from "./wcag-catalog";
import { SEVERITIES, severityRank as domainSeverityRank, type Severity } from "@engine/domain/vocab";
import { planAllowsReportBranding } from "@/lib/entitlements";

export type { Severity };

type SB = SupabaseClient<Database>;

const SEVERITY_ORDER = SEVERITIES;

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
  task_definition?: unknown;
  task_outcomes?: unknown;
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
  priorityScore: number;
  priorityReason: string;
  criteria: Criterion[];
  description: string;
  recommendation: string;
  /** Per-state location(s) where axe saw the defect. */
  locations: string[];
}

export interface PersonaImpact {
  personaId: string;
  goalCompleted: boolean;
  steps: number;
  verdictStates: number;
  blockedVerdictStates: number;
}

export interface FixCluster {
  id: string;
  label: string;
  summary: string;
  nextStep: string;
  verdictCount: number;
  severities: Record<Severity, number>;
}

export interface ReportData {
  task?: TaskDefinition | null;
  taskOutcomes: TaskOutcome[];
  runId: string;
  url: string;
  auditDate: string;
  personaIds: string[];
  severityCounts: Record<Severity, number>;
  verdicts: ReportVerdict[];
  /** Persona task-success summary, separate from compliance verdicts. */
  personaImpact: PersonaImpact[];
  /** Action-oriented grouping for remediation planning. */
  fixClusters: FixCluster[];
  /** WCAG 2.2 A+AA conformance table (the honest automated ACR). */
  conformance: ConformanceSummary;
  /** Client project name when the run is linked to a project. */
  clientName: string | null;
  /** Agency display name from the caller's profile (white-label "Prepared by"). */
  agencyName: string | null;
}

interface JourneyRow {
  persona_id: string;
  goal_completed: boolean;
  page_url: string | null;
  step: number;
}

function severityRank(severity: string): number {
  return SEVERITIES.includes(severity as Severity)
    ? domainSeverityRank(severity as Severity)
    : SEVERITY_ORDER.length;
}

function priorityBase(severity: string): number {
  switch (severity) {
    case "critical":
      return 80;
    case "serious":
      return 60;
    case "moderate":
      return 35;
    case "minor":
      return 15;
    default:
      return 10;
  }
}

const CLUSTER_META: Record<string, Omit<FixCluster, "verdictCount" | "severities">> = {
  labels: {
    id: "labels",
    label: "Labels & form names",
    summary: "Inputs and form controls are missing programmatic names or instructions.",
    nextStep: "Pair every input/control with a visible label or accessible name, then retest forms keyboard-only.",
  },
  contrast: {
    id: "contrast",
    label: "Color contrast",
    summary: "Text or UI states do not meet minimum contrast at the tested state.",
    nextStep: "Adjust tokens or component variants, then verify contrast in light, dark, hover, disabled, and focus states.",
  },
  media: {
    id: "media",
    label: "Images & media alternatives",
    summary: "Images, media, or non-text content need useful alternatives.",
    nextStep: "Add meaningful alt text for informative media and empty alt text for decorative assets.",
  },
  navigation: {
    id: "navigation",
    label: "Structure, headings & landmarks",
    summary: "Page structure is hard to navigate by assistive technology.",
    nextStep: "Verify one main landmark, sensible heading order, page language, and named regions.",
  },
  controls: {
    id: "controls",
    label: "Interactive controls & ARIA",
    summary: "Buttons, links, widgets, or ARIA patterns are missing reliable name/role/value behavior.",
    nextStep: "Prefer native controls, remove unnecessary ARIA, and test every custom widget by keyboard and screen reader.",
  },
  keyboard: {
    id: "keyboard",
    label: "Keyboard & focus",
    summary: "Keyboard reachability or focus visibility needs manual confirmation.",
    nextStep: "Tab through the full task path, confirm focus is visible and never hidden behind sticky UI.",
  },
  content: {
    id: "content",
    label: "Content, language & documents",
    summary: "Language, copy, downloadable documents, or status messages need review.",
    nextStep: "Check page language, error/status announcements, PDF/document alternatives, and redundant-entry flows.",
  },
  other: {
    id: "other",
    label: "Other detected defects",
    summary: "Detected violations that do not fit a common remediation cluster.",
    nextStep: "Review each rule in context and decide whether it needs design, content, or code ownership.",
  },
};

function clusterIdFor(v: ReportVerdict): keyof typeof CLUSTER_META {
  const haystack = `${v.ruleId ?? ""} ${v.title} ${v.description} ${v.recommendation}`.toLowerCase();
  const criteria = v.criteria.map((c) => c.code).join(" ");

  if (/(label|input|form|autocomplete|error-message|instructions)/.test(haystack)) {
    return "labels";
  }
  if (/(contrast|color)/.test(haystack) || criteria.includes("1.4.3")) {
    return "contrast";
  }
  if (/(image|img|alt|audio|video|media|caption)/.test(haystack) || criteria.startsWith("1.1")) {
    return "media";
  }
  if (/(landmark|region|heading|h1|language|html-has-lang|page-has-heading)/.test(haystack)) {
    return "navigation";
  }
  if (/(aria|button|link|role|name|value|menu|dialog|tabindex)/.test(haystack)) {
    return "controls";
  }
  if (/(keyboard|focus|skip-link|bypass|target-size)/.test(haystack) || criteria.includes("2.4.7")) {
    return "keyboard";
  }
  if (/(document|pdf|status|message|redundant|authentication|help|language)/.test(haystack)) {
    return "content";
  }
  return "other";
}

export function buildFixClusters(verdicts: ReportVerdict[]): FixCluster[] {
  const clusters = new Map<string, FixCluster>();

  for (const verdict of verdicts) {
    const id = clusterIdFor(verdict);
    const meta = CLUSTER_META[id];
    if (!meta) throw new Error(`Unknown fix cluster: ${id}`);
    const existing =
      clusters.get(id) ??
      ({
        ...meta,
        verdictCount: 0,
        severities: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      } satisfies FixCluster);

    existing.verdictCount += 1;
    if (verdict.severity in existing.severities) {
      existing.severities[verdict.severity as Severity] += 1;
    }
    clusters.set(id, existing);
  }

  return [...clusters.values()].sort((a, b) => {
    const severityDelta =
      SEVERITY_ORDER.findIndex((s) => a.severities[s] > 0) -
      SEVERITY_ORDER.findIndex((s) => b.severities[s] > 0);
    if (severityDelta !== 0) return severityDelta;
    return b.verdictCount - a.verdictCount;
  });
}

/** Split a stored page_url that may be a comma-joined seenOn list into clean locations. */
export function splitLocations(pageUrl: string | null | undefined): string[] {
  if (!pageUrl) return [];
  return pageUrl
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildPersonaImpact(rows: JourneyRow[], findings: FindingRow[]): PersonaImpact[] {
  if (rows.length === 0) return [];

  const verdictUrls = new Set(
    findings
      .filter((f) => f.source === "axe")
      .flatMap((f) => splitLocations(f.page_url)),
  );
  const grouped = new Map<string, JourneyRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.persona_id) ?? [];
    list.push(row);
    grouped.set(row.persona_id, list);
  }

  return [...grouped.entries()].map(([personaId, list]) => {
    const goalCompleted = list[0]?.goal_completed ?? false;
    const states = new Set(
      list
        .map((row) => row.page_url)
        .filter((url): url is string => typeof url === "string" && verdictUrls.has(url)),
    );
    return {
      personaId,
      goalCompleted,
      steps: new Set(list.map((row) => row.step)).size,
      verdictStates: states.size,
      blockedVerdictStates: goalCompleted ? 0 : states.size,
    };
  });
}

function priorityForVerdict(
  severity: string,
  locations: string[],
  journeyRows: JourneyRow[],
  taskCheck = false,
): { score: number; reason: string } {
  const locationSet = new Set(locations);
  const personasAtState = new Set<string>();
  const blockedAtState = new Set<string>();

  for (const row of journeyRows) {
    if (!row.page_url || !locationSet.has(row.page_url)) continue;
    personasAtState.add(row.persona_id);
    if (!taskCheck && !row.goal_completed) blockedAtState.add(row.persona_id);
  }

  const score = Math.min(
    100,
    priorityBase(severity) + blockedAtState.size * 15 + personasAtState.size * 5,
  );
  const reason =
    blockedAtState.size > 0
      ? `${blockedAtState.size} blocked persona${blockedAtState.size === 1 ? "" : "s"} reached this state`
      : personasAtState.size > 0
        ? `${personasAtState.size} persona${personasAtState.size === 1 ? "" : "s"} reached this state`
        : "Prioritized by axe severity";

  return { score, reason };
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
  journeyRowsOrBranding: JourneyRow[] | { clientName?: string | null; agencyName?: string | null } = [],
  branding: { clientName?: string | null; agencyName?: string | null } = {},
): ReportData {
  const journeyRows = Array.isArray(journeyRowsOrBranding) ? journeyRowsOrBranding : [];
  const resolvedBranding = Array.isArray(journeyRowsOrBranding)
    ? branding
    : journeyRowsOrBranding;
  const task = parseTaskDefinition(run.task_definition);
  const personaImpact = buildPersonaImpact(journeyRows, rows);
  const verdicts: ReportVerdict[] = rows
    .filter((f) => f.source === "axe")
    .map((f) => {
      const locations = splitLocations(f.page_url);
      const priority = priorityForVerdict(f.severity, locations, journeyRows, Boolean(run.task_definition));
      return {
        id: f.id,
        title: f.title,
        ruleId: f.rule_id,
        severity: f.severity,
        priorityScore: priority.score,
        priorityReason: priority.reason,
        criteria: wcagTagsToCriteria(f.wcag_tags),
        description: f.description,
        recommendation: f.recommendation,
        locations,
      };
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const severityCounts = SEVERITY_ORDER.reduce(
    (acc, s) => {
      acc[s] = verdicts.filter((v) => v.severity === s).length;
      return acc;
    },
    {} as Record<Severity, number>,
  );

  return {
    task,
    taskOutcomes: task ? parseTaskOutcomes(task, run.task_outcomes) : [],
    runId: run.id,
    url: run.url,
    auditDate: run.created_at,
    personaIds: run.persona_ids,
    severityCounts,
    verdicts,
    personaImpact,
    fixClusters: buildFixClusters(verdicts),
    conformance: buildConformance(verdicts, WCAG22_AA_CATALOG, AXE_TESTABLE_CODES),
    clientName: resolvedBranding.clientName ?? null,
    agencyName: resolvedBranding.agencyName ?? null,
  };
}

// Reports must not turn a failed or truncated read into apparent absence of defects.
// Completed runs are read in stable ID order; a changed count invalidates assembly.
async function loadReportRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null; error: unknown; count: number | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let expectedCount: number | undefined;
  do {
    const { data, error, count } = await fetchPage(rows.length, rows.length + 999);
    if (error || !data || count === null || !Number.isSafeInteger(count) || count < 0 ||
      (expectedCount !== undefined && count !== expectedCount) ||
      rows.length + data.length > count || (data.length === 0 && rows.length < count)) {
      // Do not propagate provider details, which can contain stored customer data.
      throw new Error("Could not load complete report evidence.");
    }
    expectedCount = count;
    rows.push(...data);
  } while (rows.length < expectedCount);
  return rows;
}

/**
 * Fetch a run and its axe verdicts, scoped to the caller by RLS. Returns null when the run
 * does not exist or is not the caller's — the route turns that into a 404.
 * Optionally joins project name + the caller's agency_name for white-label headers.
 */
export async function buildReport(supabase: SB, id: string): Promise<ReportData | null> {
  // The run+findings chain and the caller's user+profile chain don't depend on each
  // other — run concurrently instead of four sequential round-trips.
  const [runAndFindings, agencyName] = await Promise.all([
    (async () => {
      const { data: run, error: runError } = await supabase
        .from("test_runs")
        .select("id,url,created_at,persona_ids,project_id,task_definition,task_outcomes")
        .eq("id", id)
        .eq("status", "completed")
        .maybeSingle();
      if (runError) throw new Error("Could not load report.");
      if (!run) return null;

      const findingRows = await loadReportRows((from, to) => supabase
        .from("findings")
        .select(
          "id,source,severity,title,description,recommendation,rule_id,wcag_tags,page_url",
          { count: "exact" },
        )
        .eq("test_run_id", run.id)
        .eq("source", "axe")
        .order("id", { ascending: true })
        .range(from, to));

      const journeyRows = await loadReportRows((from, to) => supabase
        .from("journey_steps")
        .select("persona_id,goal_completed,page_url,step", { count: "exact" })
        .eq("test_run_id", run.id)
        .order("id", { ascending: true })
        .range(from, to));

      return { run, findingRows, journeyRows };
    })(),
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan,agency_name")
        .eq("id", user.id)
        .single();
      // White-label headers are an agency-tier entitlement. A stored name from a
      // previous tier stays in the row but is not rendered, so a downgrade drops the
      // branding instead of leaking it.
      if (!planAllowsReportBranding(profile?.plan)) return null;
      return profile?.agency_name ?? null;
    })(),
  ]);

  if (!runAndFindings) return null;
  const { run, findingRows, journeyRows } = runAndFindings;

  let clientName: string | null = null;
  if (run.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", run.project_id)
      .single();
    clientName = project?.name ?? null;
  }

  return assembleReport(run, findingRows, journeyRows, { clientName, agencyName });
}
