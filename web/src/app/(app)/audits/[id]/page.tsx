import { TaskEvidencePanel } from "@/components/task-evidence";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { RetestButton } from "@/components/retest-button";
import { buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { formatLocation } from "@/lib/format-location";
import { formatShortDate } from "@/lib/format";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { SEVERITY_ORDER, type Severity } from "@/components/forensic/severity";
import { loadJourney } from "@/lib/journey";
import { groupFindingsByRule } from "@/lib/audit-rules";
import { displayFinding } from "@/lib/finding-display";
import { groupPriority } from "@/lib/priority-groups";
import { ReplayTheater, type ReplayFinding } from "@/components/replay-theater";
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

// Task-success is a fraction of real-shaped users, not a compliance verdict — this
// borrows the same red/amber/green ramp the Meter component's `tone` prop uses for the
// same non-axe metric, not the SeverityChip vocabulary (that's axe-only).
function successTone(achieved: number, total: number): "minor" | "moderate" | "critical" | "muted" {
  if (total === 0) return "muted";
  const pct = achieved / total;
  if (pct >= 0.8) return "minor";
  if (pct >= 0.5) return "moderate";
  return "critical";
}

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
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids,project_id,task_definition,task_outcomes")
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

  // axe verdicts keyed by the exact state they were seen on, so the replay can surface
  // "evidence captured here" at the matching frame.
  const findingsByUrl: Record<string, ReplayFinding[]> = {};
  for (const f of axeFindings) {
    if (!f.page_url) continue;
    (findingsByUrl[f.page_url] ??= []).push({ severity: f.severity, title: f.title });
  }

  const personaMeta: Record<string, { name: string; role: string }> = {};
  for (const j of journeys) {
    const meta = PERSONA_DATA[j.personaId as keyof typeof PERSONA_DATA];
    personaMeta[j.personaId] = { name: meta?.name ?? j.personaId, role: meta?.role ?? "" };
  }
  const personaImpact = journeys.map((j) => {
    const pagesWithVerdicts = new Set(
      j.steps
        .map((step) => step.pageUrl)
        .filter((url): url is string => typeof url === "string" && (findingsByUrl[url]?.length ?? 0) > 0),
    );
    return {
      personaId: j.personaId,
      name: personaMeta[j.personaId]?.name ?? j.personaId,
      role: personaMeta[j.personaId]?.role ?? "",
      goalCompleted: j.goalCompleted,
      steps: j.steps.length,
      verdictStates: pagesWithVerdicts.size,
      maxFrustration: Math.max(0, ...j.steps.map((step) => step.frustration)),
    };
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
  const caseStatus =
    openWorkflowCount === 0 && axeFindings.length > 0
      ? "All clear"
      : axeFindings.length === 0
        ? "No findings"
        : `${openWorkflowCount} open`;

  const evidenceJourney = journeys.find((journey) => journey.personaId === personaParam);
  const verificationIndex = evidenceJourney?.steps.findIndex((step) => step.action === "verify_task") ?? -1;
  const initialStep = evidence === "task" && verificationIndex >= 0
    ? verificationIndex
    : Number.isFinite(Number(stepParam)) ? Number(stepParam) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted-foreground">
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
        <div>
          <div className="file-tab">
            <span>Case {run.id.slice(0, 8)}</span>
            <span className="text-foreground/70">·</span>
            <span className="normal-case">{host}</span>
            <span className="text-foreground/70">·</span>
            <span className="normal-case">{caseDate}</span>
            <span className="ml-auto normal-case text-[var(--redline)]">·&nbsp;{caseStatus}</span>
          </div>
          <div className="sheet -mt-px flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0">
              <h1 className="display text-xl leading-tight sm:text-2xl">
                <span className="break-all">{run.url}</span>
              </h1>
              {axeFindings.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </div>
        <Meter
          className="w-full max-w-xs"
          value={achieved}
          total={total}
          label={run.task_definition ? "expected text observed" : "task success"}
          unit={run.task_definition ? "profiles matched the check" : "personas reached their goal"}
          tone={successTone(achieved, total)}
        />
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <TaskEvidencePanel task={run.task_definition} outcomes={run.task_outcomes} runId={run.id} />
      {evidence === "task" && verificationIndex < 0 ? (
        <p role="status" className="text-sm text-muted-foreground">The verification frame is unavailable. The saved text-check result is shown above.</p>
      ) : null}

      {/* Fix first — what to remediate before the full evidence wall. */}
      {priorityFindings.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="label-mono">Priority</p>
            <h2 className="display text-2xl leading-tight">Fix first</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Severity combined with persona task impact.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {priorityFindings.map((f) => (
              <div key={f.key} className="sheet p-4">
                <div className="flex items-center justify-between gap-3">
                  <SeverityChip severity={f.severity as Severity} />
                  <span className="font-mono text-lg font-semibold tabular-nums">{f.priorityScore}</span>
                </div>
                <p className="mt-3 text-sm font-medium">
                  {displayFinding({ ruleId: f.ruleId, title: f.title, description: null, recommendation: null }).title}
                </p>
                {f.pages > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.issues} {f.issues === 1 ? "issue" : "issues"} on {f.pages} {f.pages === 1 ? "page or state" : "pages or states"}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.priorityReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Axe findings */}
      {axeFindings.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <p className="label-mono">Axe-core verdicts · deterministic</p>
              <h2 className="display text-2xl leading-tight">Accessibility issues</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Deterministic, cited to WCAG.
              </p>
            </div>
            <ReportIssueCopyAll findings={openAxeFindings.map(toIssueFinding)} />
          </div>
          <div className="sheet grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-4 sm:divide-y-0">
            <div className="p-3">
              <p className="label-mono">open work</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{openWorkflowCount}</p>
            </div>
            {FINDING_STATUSES.slice(1, 4).map((status) => (
              <div key={status} className="p-3">
                <p className="label-mono">{FINDING_STATUS_LABELS[status]}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{workflowCounts[status]}</p>
              </div>
            ))}
          </div>
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
                    <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Rule</th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Severity</th>
                    <th scope="col" className="py-2 pr-4 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Issues</th>
                    <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Pages</th>
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
          <div className="sheet overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 label-mono">
              <span>Showing</span>
              <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs tabular-nums normal-case text-muted-foreground">
                {filteredAxeFindings.length} / {axeFindings.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {filteredAxeFindings.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
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
                <div key={f.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SeverityChip severity={f.severity} />
                    <span className="text-sm font-medium text-card-foreground">
                      {shown.title}
                    </span>
                    {shown.ruleId ? (
                      <code className="font-mono text-xs text-muted-foreground">{shown.ruleId}</code>
                    ) : null}
                    <span className="rounded-sm border border-border px-2 py-0.5 label-mono">
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
                    <summary className="label-mono flex w-fit list-none cursor-pointer select-none items-center gap-1.5 rounded-sm border border-border px-2 py-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] [&::-webkit-details-marker]:hidden">
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


      {/* AI opinion: everything from persona runs. Kept after, and apart from, the axe verdicts. */}
      {(journeys.length > 0 || personaImpact.length > 0 || byPersona.size > 0) && (
        <section aria-labelledby="ai-opinion-heading" className="space-y-8 border-t-2 border-foreground pt-6">
          <div className="space-y-1.5">
            <span className="redline-note uppercase tracking-[0.1em]">Opinion · AI</span>
            <h2 id="ai-opinion-heading" className="display text-2xl leading-tight">AI persona opinion</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              What AI browser personas did while trying to finish a task. This is usability
              opinion and task evidence, not an accessibility verdict. The axe-core findings
              above are the deterministic record.
            </p>
          </div>
      {/* Persona Replay Theater — the scrubbable walk a real user took */}
      {journeys.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="label-mono">Evidence walk</p>
            <h3 className="display text-xl leading-tight">Replay</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              What a persona saw, thought, and hit, step by step.
            </p>
          </div>
          <ReplayTheater
            journeys={journeys}
            personaMeta={personaMeta}
            findingsByUrl={findingsByUrl}
            initialPersona={personaParam}
            initialStep={initialStep}
            taskCheck={Boolean(run.task_definition)}
          />
        </div>
      )}

      {/* Persona impact — the client story before the raw evidence. */}
      {personaImpact.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="label-mono">Client story</p>
            <h3 className="display text-xl leading-tight">Persona impact</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {run.task_definition
                ? "Which profiles matched the text check, and where evidence was captured."
                : "Who got through, who got blocked, and where proof appeared."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {personaImpact.map((persona) => (
              <Link
                key={persona.personaId}
                href={`/audits/${run.id}?persona=${encodeURIComponent(persona.personaId)}&step=0`}
                className="sheet p-4 transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{persona.name}</p>
                    <p className="text-xs text-muted-foreground">{persona.role}</p>
                  </div>
                  <span className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${persona.goalCompleted ? "border-[var(--severity-minor)] text-[var(--severity-minor)]" : "border-[var(--severity-critical)] text-[var(--severity-critical)]"}`}>
                    {run.task_definition ? (persona.goalCompleted ? "text observed" : "not verified") : (persona.goalCompleted ? "reached" : "blocked")}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs text-muted-foreground">
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{persona.steps}</p>
                    <p>steps</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{persona.verdictStates}</p>
                    <p>states</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{persona.maxFrustration}</p>
                    <p>friction</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Persona findings */}
      {byPersona.size > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
                        <h3 className="display text-xl leading-tight">Persona findings</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Usability notes from AI browser personas trying to finish a real task, never a
              compliance verdict and never mixed into the axe verdicts above.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[...byPersona.entries()].map(([personaId, list]) => {
              const meta = PERSONA_DATA[personaId as keyof typeof PERSONA_DATA];
              return (
                <div
                  key={personaId}
                  className="sheet space-y-3 p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{meta?.name ?? personaId}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta?.role ?? ""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {list.map((f) => (
                      <div
                        key={f.id}
                        className="space-y-1.5 rounded-sm border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Opinion tier — never SeverityChip (axe severity vocab). */}
                          <span className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 label-mono">
                            AI observation
                          </span>
                          <span className="text-xs font-medium truncate">
                            {f.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {f.description}
                        </p>
                        {formatLocation(f.page_url) && (
                          <p className="font-mono text-xs text-muted-foreground">
                            found at {formatLocation(f.page_url)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </section>
      )}

      {findings.length === 0 && (
        <EmptyPrompt
          prompt="no findings recorded for this audit"
          hint="Either the crawl found a clean pass, or this run predates finding capture."
        />
      )}
    </div>
  );
}
