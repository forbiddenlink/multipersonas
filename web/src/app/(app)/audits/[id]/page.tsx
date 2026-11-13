import { ScanCoveragePanel } from "@/components/scan-coverage";
import { hasCompleteScanCoverage, parseScanCoverage } from "@/lib/scan-coverage";
import { TaskEvidencePanel } from "@/components/task-evidence";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { RetestButton } from "@/components/retest-button";
import { buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { personaLibrary, isBuiltinPersonaId } from "@engine/personas/library";
import { buildPersonaOutcomes, describeDevice } from "@/lib/persona-outcomes";
import { SessionRecorder } from "@/components/session-recorder";
import { buildRecorderLanes } from "@/lib/recorder-lanes";
import { StuckPoints } from "@/components/stuck-points";
import { formatLocation } from "@/lib/format-location";
import { formatShortDate } from "@/lib/format";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { SEVERITY_ORDER, type Severity } from "@/components/forensic/severity";
import { loadJourney } from "@/lib/journey";
import { groupFindingsByRule } from "@/lib/audit-rules";
import { displayFinding } from "@/lib/finding-display";
import { groupPriority } from "@/lib/priority-groups";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  FINDING_STATUS_LABELS,
  FINDING_STATUSES,
  isFindingStatus,
} from "@/lib/finding-workflow";
import { wcagTagsToCriteria } from "@/lib/wcag";
import { splitLocations } from "@/lib/report";
import { updateFindingWorkflowAction } from "./actions";
import { ReportIssueCopy } from "./report-issue-copy";
import { ReportIssueCopyAll } from "./report-issue-copy-all";
import type { IssueFindingInput } from "./report-issue-markdown";

export const metadata: Metadata = {
  title: "Audit details",
};

// Unknown/legacy severities sort last rather than first — mirrors lib/report.ts.
function severityRank(value: string): number {
  const i = SEVERITY_ORDER.indexOf(value as Severity);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

// Shape a persisted axe finding row into the "Copy as issue" builder's input — never
// fabricating a field the row doesn't carry (rule_id/wcag_tags/target are all nullable
// for pre-migration rows; see supabase/migrations/010_findings_wcag.sql, 012_findings_target.sql).
function toIssueFinding(f: {
  title: string;
  severity: string;
  rule_id: string | null;
  wcag_tags: string[] | null;
  target: string | null;
  page_url: string | null;
  recommendation: string | null;
}): IssueFindingInput {
  return {
    title: f.title,
    severity: f.severity,
    ruleId: f.rule_id,
    wcagCodes: wcagTagsToCriteria(f.wcag_tags).map((c) => c.code),
    target: f.target,
    locations: splitLocations(f.page_url),
    recommendation: f.recommendation,
  };
}

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    persona?: string;
    step?: string;
    evidence?: string;
    error?: string;
    status?: string;
    owner?: string;
  }>;
}) {
  const { id } = await params;
  const {
    persona: personaParam,
    step: stepParam,
    evidence,
    error,
    status: statusParam,
    owner: ownerParam,
  } = await searchParams;
  const KNOWN_AUDIT_ERRORS = new Set([
    "Choose a valid finding status.",
    "Could not update the finding.",
  ]);
  const errorMessage = typeof error === "string" && KNOWN_AUDIT_ERRORS.has(error) ? error : null;
  const selectedStatus =
    typeof statusParam === "string" && (statusParam === "all" || isFindingStatus(statusParam))
      ? statusParam
      : "all";
  const selectedOwner = typeof ownerParam === "string" ? ownerParam.trim() : "";
  const supabase = await createClient();

  // RLS scopes this to the caller's own rows; a mismatched or missing id both
  // fall through to notFound() rather than leaking existence of other users' runs.
  const { data: run } = await supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids,project_id,task_definition,task_outcomes,scan_coverage")
    .eq("id", id)
    .eq("status", "completed")
    .single();

  if (!run) notFound();

  // Retest goes through the normal audit route, so this only decides whether to offer it.
  // The route re-checks the plan, rate limit and spend cap on every click.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canRetest = planAllowsPersonas(await getSessionPlan(supabase, user?.id ?? null));

  const { data: findingRows } = await supabase
    .from("findings")
    .select(
      "id,persona_id,source,severity,category,title,description,recommendation,page_url,status,owner,notes,resolved_at,rule_id,wcag_tags,target"
    )
    .eq("test_run_id", run.id)
    .order("created_at", { ascending: true });

  const findings = findingRows ?? [];
  const axeFindings = findings.filter((f) => f.source === "axe");
  const personaFindings = findings.filter((f) => f.source !== "axe");

  const byPersona = new Map<string, typeof personaFindings>();
  for (const f of personaFindings) {
    const list = byPersona.get(f.persona_id) ?? [];
    list.push(f);
    byPersona.set(f.persona_id, list);
  }

  // Most-severe first — same wall as the report export: axe findings are the
  // compliance verdict, ordered critical → serious → moderate → minor.
  const sortedAxeFindings = [...axeFindings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
  const workflowCounts = Object.fromEntries(
    FINDING_STATUSES.map((status) => [
      status,
      axeFindings.filter((f) => (f.status ?? "open") === status).length,
    ]),
  ) as Record<(typeof FINDING_STATUSES)[number], number>;
  const openAxeFindings = axeFindings.filter(
    (f) => !["fixed", "accepted-risk", "false-positive"].includes(f.status ?? "open"),
  );
  const openWorkflowCount = openAxeFindings.length;
  const owners = [...new Set(axeFindings.map((f) => f.owner?.trim()).filter(Boolean))].sort();
  const filteredAxeFindings = sortedAxeFindings.filter((f) => {
    const matchesStatus = selectedStatus === "all" || (f.status ?? "open") === selectedStatus;
    const matchesOwner = !selectedOwner || f.owner === selectedOwner;
    return matchesStatus && matchesOwner;
  });

  const ruleGroups = groupFindingsByRule(axeFindings);

  const total = run.task_success_total ?? 0;
  const achieved = run.task_success_achieved ?? 0;

  // Persona Replay Theater: the scrubbable walk, if this run captured one (runs predating
  // journey capture, and anon runs, simply have none — the section then hides).
  const journeys = await loadJourney(supabase, run.id);

  const personaName = (id: string) => PERSONA_DATA[id as keyof typeof PERSONA_DATA]?.name ?? id;
  const personaOutcomes = buildPersonaOutcomes({
    personaIds: run.persona_ids ?? [],
    journeys,
    taskCheck: Boolean(run.task_definition),
    runTotals: { achieved, total },
    meta: (id) => ({
      name: personaName(id),
      role: PERSONA_DATA[id as keyof typeof PERSONA_DATA]?.role ?? "",
      device: isBuiltinPersonaId(id) ? describeDevice(personaLibrary[id]) : "",
    }),
    notesByPersona: Object.fromEntries(
      [...byPersona].map(([id, list]) => [id, list.map((f) => f.title)]),
    ),
  });
  const journeyRows = journeys.flatMap((journey) =>
    journey.steps.map((step) => ({
      personaId: journey.personaId,
      goalCompleted: journey.goalCompleted,
      pageUrl: step.pageUrl,
    })),
  );
  const scoredFindings = sortedAxeFindings
    .map((f) => {
      const impacted = new Set<string>();
      const blocked = new Set<string>();
      for (const row of journeyRows) {
        if (!row.pageUrl || row.pageUrl !== f.page_url) continue;
        impacted.add(row.personaId);
        if (!run.task_definition && !row.goalCompleted) blocked.add(row.personaId);
      }
      const base = f.severity === "critical" ? 80 : f.severity === "serious" ? 60 : f.severity === "moderate" ? 35 : 15;
      return {
        ...f,
        priorityScore: Math.min(100, base + blocked.size * 15 + impacted.size * 5),
        priorityReason:
          blocked.size > 0
            ? `${blocked.size} blocked persona${blocked.size === 1 ? "" : "s"} reached this state`
            : impacted.size > 0
              ? `${impacted.size} persona${impacted.size === 1 ? "" : "s"} reached this state`
              : "Prioritized by axe severity",
      };
    });
  // One card per rule, so the top three are three different problems.
  const priorityFindings = groupPriority(
    scoredFindings.map((f) => ({
      id: f.id,
      ruleId: f.rule_id,
      title: f.title,
      severity: f.severity,
      priorityScore: f.priorityScore,
      priorityReason: f.priorityReason,
      locations: splitLocations(f.page_url),
    })),
    3,
  );

  const severityCounts = Object.fromEntries(
    SEVERITY_ORDER.map((sev) => [sev, axeFindings.filter((f) => f.severity === sev).length]),
  ) as Record<Severity, number>;
  let host = run.url;
  try {
    host = new URL(run.url).host;
  } catch {
    // run.url may be a bare host on older rows — keep it as-is.
  }
  const caseDate = formatShortDate(run.created_at);
  const scanCoverage = parseScanCoverage(run.scan_coverage);
  const caseStatus = !hasCompleteScanCoverage(scanCoverage)
    ? scanCoverage ? "Coverage incomplete" : "Coverage unknown"
    : openWorkflowCount === 0 && axeFindings.length > 0
      ? "All clear"
      : axeFindings.length === 0
        ? "No findings"
        : `${openWorkflowCount} open`;

  // Session recorder inputs: everything below is already loaded above, nothing new is queried.
  const recorder = buildRecorderLanes({
    cards: personaOutcomes.cards,
    journeys,
    notesByPersona: byPersona,
    axeFindings: sortedAxeFindings,
    personaParam,
    stepParam,
    evidence,
  });
  const verificationIndex =
    journeys.find((journey) => journey.personaId === personaParam)?.steps.findIndex((step) => step.action === "verify_task") ?? -1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href="/dashboard"
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                dashboard
              </Link>
            </li>
            {run.project_id ? (
              <>
                <li aria-hidden="true" className="select-none">
                  /
                </li>
                <li>
                  <Link
                    href="/projects"
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    projects
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true" className="select-none">
              /
            </li>
            <li className="text-foreground" aria-current="page">
              audit
            </li>
          </ol>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="display text-2xl leading-tight sm:text-3xl">
              <span className="break-all">{run.url}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {host} · run {run.id.slice(0, 8)} · {caseDate} ·{" "}
              <span className="font-medium text-foreground">{caseStatus}</span>
            </p>
            {axeFindings.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {SEVERITY_ORDER.filter((sev) => severityCounts[sev] > 0).map((sev) => (
                  <span key={sev} className="inline-flex items-center gap-1.5">
                    <SeverityChip severity={sev} />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {severityCounts[sev]}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <Link
              href={`/audits/${run.id}/report`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Export accessibility report
            </Link>
            {canRetest ? (
              <RetestButton url={run.url} personaIds={run.persona_ids ?? []} projectId={run.project_id} />
            ) : null}
          </div>
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      {recorder.personas.length > 0 || recorder.axePages.length > 0 || recorder.axeNotShown > 0 ? (
        <div className="space-y-6">
          <SessionRecorder
            personas={recorder.personas}
            headline={personaOutcomes.headline}
            axePages={recorder.axePages}
            axeNotShown={recorder.axeNotShown}
            initialPersona={recorder.initialPersona}
            initialStep={recorder.initialStep}
            taskCheck={Boolean(run.task_definition)}
          />
          <p className="max-w-3xl text-sm text-muted-foreground">
            Persona output is usability opinion from AI personas browsing toward a goal. It is not
            an accessibility verdict, and no persona simulates a person with a disability. The
            axe-core lane is the deterministic accessibility record.
          </p>
          <StuckPoints points={personaOutcomes.stuckPoints} nameOf={personaName} />
        </div>
      ) : null}

      <TaskEvidencePanel task={run.task_definition} outcomes={run.task_outcomes} runId={run.id} />
      {evidence === "task" && verificationIndex < 0 ? (
        <p role="status" className="text-sm text-muted-foreground">The verification frame is unavailable. The saved text-check result is shown above.</p>
      ) : null}

      <section aria-labelledby="scan-heading" className="space-y-10 border-t-2 border-foreground pt-6">
        <div className="space-y-1.5">
          <h2 id="scan-heading" className="display text-2xl leading-tight">Accessibility scan (axe-core)</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Deterministic findings from axe-core, cited to WCAG.
          </p>
        </div>
        <ScanCoveragePanel coverage={scanCoverage} />
        {axeFindings.length === 0 && !hasCompleteScanCoverage(scanCoverage) && (
          <ReportIssueCopyAll findings={[]} scanCoverage={scanCoverage} />
        )}

      {/* Fix first — what to remediate before the full evidence wall. */}
      {priorityFindings.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="display text-xl leading-tight">Fix first</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Each score is out of 100. It starts from axe severity (critical 80,
              serious 60, moderate 35, minor 15), adds 15 for each persona blocked at an affected page
              or state and 5 for each persona that reached one, and stops at 100. Findings grouped
              by rule show the highest score in the group.
            </p>
          </div>
          <ol className="divide-y divide-border border-y border-border">
            {priorityFindings.map((f, n) => (
              <li
                key={f.key}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 px-1 py-3"
              >
                <span className="font-mono text-sm font-bold tabular-nums">{n + 1}</span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <SeverityChip severity={f.severity as Severity} />
                    <span className="text-sm font-medium">
                      {displayFinding({ ruleId: f.ruleId, title: f.title, description: null, recommendation: null }).title}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {f.pages > 0
                      ? `${f.issues} ${f.issues === 1 ? "issue" : "issues"} on ${f.pages} ${f.pages === 1 ? "page or state" : "pages or states"}. `
                      : ""}
                    {f.priorityReason}
                  </p>
                </div>
                <span className="text-sm tabular-nums">
                  Priority <span className="font-mono text-lg font-semibold">{f.priorityScore}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Axe findings */}
      {axeFindings.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <h3 className="display text-xl leading-tight">Accessibility issues</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Deterministic, cited to WCAG.
              </p>
            </div>
            <ReportIssueCopyAll findings={openAxeFindings.map(toIssueFinding)} scanCoverage={scanCoverage} />
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
            <div className="px-3 py-2.5">
              <dt className="text-[13px] text-muted-foreground">Open work</dt>
              <dd className="font-mono text-2xl font-semibold tabular-nums">{openWorkflowCount}</dd>
            </div>
            {FINDING_STATUSES.slice(1, 4).map((status) => (
              <div key={status} className="px-3 py-2.5">
                <dt className="text-[13px] text-muted-foreground">{FINDING_STATUS_LABELS[status]}</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums">{workflowCounts[status]}</dd>
              </div>
            ))}
          </dl>
          {ruleGroups.length > 0 && (
            <div
              tabIndex={0}
              role="region"
              aria-label="Findings by rule table"
              className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
                <caption className="sr-only">Axe findings grouped by rule, with issue and page counts</caption>
                <thead>
                  <tr className="border-b-2 border-foreground">
                    <th scope="col" className="py-2 pr-4 text-[13px] font-normal text-muted-foreground">Rule</th>
                    <th scope="col" className="py-2 pr-4 text-[13px] font-normal text-muted-foreground">Severity</th>
                    <th scope="col" className="py-2 pr-4 text-right text-[13px] font-normal text-muted-foreground">Issues</th>
                    <th scope="col" className="py-2 text-right text-[13px] font-normal text-muted-foreground">Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleGroups.map((g) => (
                    <tr key={g.key} className="border-b border-border">
                      <th scope="row" className="py-2.5 pr-4 font-normal">
                        <span className="font-mono text-xs">{g.key}</span>
                      </th>
                      <td className="py-2.5 pr-4"><SeverityChip severity={g.severity as Severity} /></td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{g.count}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{g.pages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="label-mono">
                Status
              </Label>
              <select
                id="status-filter"
                name="status"
                defaultValue={selectedStatus}
                className="h-10 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <option value="all">All statuses</option>
                {FINDING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {FINDING_STATUS_LABELS[status]} ({workflowCounts[status]})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner-filter" className="label-mono">
                Owner
              </Label>
              <select
                id="owner-filter"
                name="owner"
                defaultValue={selectedOwner}
                className="h-10 rounded-sm border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <option value="">All owners</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Apply
            </button>
          </form>
          <div className="border-t-2 border-foreground">
            <p className="flex items-center gap-2 border-b border-border py-2 text-sm">
              <span className="font-semibold">Showing</span>
              <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                {filteredAxeFindings.length} of {axeFindings.length}
              </span>
            </p>
            <div className="divide-y divide-border border-b border-border">
              {filteredAxeFindings.length === 0 && (
                <div className="py-6 text-sm text-muted-foreground">
                  No issues match those filters.
                </div>
              )}
              {filteredAxeFindings.map((f) => {
                const shown = displayFinding({
                  ruleId: f.rule_id,
                  title: f.title,
                  description: f.description,
                  recommendation: f.recommendation,
                });
                return (
                <div key={f.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SeverityChip severity={f.severity} />
                    <span className="text-sm font-medium text-card-foreground">
                      {shown.title}
                    </span>
                    {shown.ruleId ? (
                      <code className="font-mono text-xs text-muted-foreground">{shown.ruleId}</code>
                    ) : null}
                    <span className="text-[13px] font-semibold text-muted-foreground">
                      <span aria-hidden="true">{(f.status ?? "open") === "open" ? "○ " : "● "}</span>
                      {FINDING_STATUS_LABELS[f.status as keyof typeof FINDING_STATUS_LABELS] ??
                        "Open"}
                    </span>
                  </div>
                  {shown.why ? (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                      {shown.why}
                    </p>
                  ) : null}
                  {shown.fix || shown.learnMore ? (
                    <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                      {shown.fix}
                      {shown.fix && shown.learnMore ? " " : null}
                      {shown.learnMore ? (
                        <a
                          href={shown.learnMore}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          Learn more<span className="sr-only"> about {shown.title} (opens in a new tab)</span>
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  {formatLocation(f.page_url) && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      <span className="select-none">found at&nbsp;</span>
                      {formatLocation(f.page_url)}
                    </p>
                  )}
                  <ReportIssueCopy finding={toIssueFinding(f)} className="mt-3" />
                  <details className="mt-3 group/details">
                    <summary className="flex w-fit list-none text-[13px] font-semibold cursor-pointer select-none items-center gap-1.5 rounded-sm border border-border px-2 py-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className="inline-block transition-transform group-open/details:rotate-90">▸</span>
                      Update status
                    </summary>
                    <form
                      action={updateFindingWorkflowAction.bind(null, run.id, f.id)}
                      className="mt-3 grid gap-3 rounded-sm border border-border bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`status-${f.id}`}
                        className="label-mono"
                      >
                        Status
                      </Label>
                      <select
                        id={`status-${f.id}`}
                        name="status"
                        defaultValue={f.status ?? "open"}
                        className="h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                      >
                        {FINDING_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {FINDING_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`owner-${f.id}`}
                        className="label-mono"
                      >
                        Owner
                      </Label>
                      <Input
                        id={`owner-${f.id}`}
                        name="owner"
                        defaultValue={f.owner ?? ""}
                        placeholder="Design, dev, or email"
                        maxLength={200}
                      />
                    </div>
                    <div className="flex items-end">
                      <SubmitButton variant="outline" size="sm" className="w-full sm:w-auto">
                        Save
                      </SubmitButton>
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label
                        htmlFor={`notes-${f.id}`}
                        className="label-mono"
                      >
                        Notes
                      </Label>
                      <textarea
                        id={`notes-${f.id}`}
                        name="notes"
                        defaultValue={f.notes ?? ""}
                        maxLength={2000}
                        rows={2}
                        className="min-h-20 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                        placeholder="Fix plan, acceptance note, or handoff context"
                      />
                    </div>
                    </form>
                  </details>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      </section>

      {/* AI opinion: persona notes. Kept after, and apart from, the axe verdicts. */}
      {byPersona.size > 0 && (
        <section aria-labelledby="ai-opinion-heading" className="space-y-4 border-t-2 border-foreground pt-6">
          <div className="space-y-1.5">
            <h2 id="ai-opinion-heading" className="display text-2xl leading-tight">AI persona opinion</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              <span className="font-semibold text-[var(--redline)]">AI opinion.</span> Usability notes
              from AI browser personas trying to finish a task. They are never an accessibility
              finding, and never mixed into the axe results above.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {[...byPersona.entries()].map(([personaId, list]) => (
              <div key={personaId} className="grid gap-x-6 gap-y-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <p className="text-sm font-medium">{personaName(personaId)}</p>
                <ul className="min-w-0 space-y-3">
                  {list.map((f) => (
                    <li key={f.id} className="space-y-0.5">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{f.description}</p>
                      {formatLocation(f.page_url) && (
                        <p className="break-all font-mono text-[13px] text-muted-foreground">
                          found at {formatLocation(f.page_url)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {findings.length === 0 && (
        <EmptyPrompt
          prompt="no findings recorded for this audit"
          hint={hasCompleteScanCoverage(scanCoverage) ? "No violations were recorded in the states checked." : "Scan coverage is incomplete or unknown. Review the scan coverage notes in the scan section."}
        />
      )}
    </div>
  );
}
