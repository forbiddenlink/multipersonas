import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { formatLocation } from "@/lib/format-location";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { SEVERITY_ORDER, type Severity } from "@/components/forensic/severity";
import { loadJourney } from "@/lib/journey";
import { ReplayTheater, type ReplayFinding } from "@/components/replay-theater";

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

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ persona?: string; step?: string }>;
}) {
  const { id } = await params;
  const { persona: personaParam, step: stepParam } = await searchParams;
  const supabase = await createClient();

  // RLS scopes this to the caller's own rows; a mismatched or missing id both
  // fall through to notFound() rather than leaking existence of other users' runs.
  const { data: run } = await supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids,project_id")
    .eq("id", id)
    .single();

  if (!run) notFound();

  const { data: findingRows } = await supabase
    .from("findings")
    .select(
      "id,persona_id,source,severity,category,title,description,recommendation,page_url"
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

  const initialStep = Number.isFinite(Number(stepParam)) ? Number(stepParam) : 0;

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="font-mono text-base font-normal text-muted-foreground">Results for </span>
              <span className="font-mono break-all">{run.url}</span>
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {new Date(run.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href={`/audits/${run.id}/report`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export accessibility report
          </Link>
        </div>
        <Meter
          className="w-full max-w-xs"
          value={achieved}
          total={total}
          label="task success"
          unit="personas reached their goal"
          tone={successTone(achieved, total)}
        />
      </div>

      {/* Persona Replay Theater — the scrubbable walk a real user took */}
      {journeys.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Replay</h2>
            <p className="font-mono text-xs text-muted-foreground">
              what a persona saw, thought, and hit — step by step
            </p>
          </div>
          <ReplayTheater
            journeys={journeys}
            personaMeta={personaMeta}
            findingsByUrl={findingsByUrl}
            initialPersona={personaParam}
            initialStep={initialStep}
          />
        </div>
      )}

      {/* Persona findings */}
      {byPersona.size > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Persona findings</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[...byPersona.entries()].map(([personaId, list]) => {
              const meta = PERSONA_DATA[personaId as keyof typeof PERSONA_DATA];
              return (
                <div
                  key={personaId}
                  className="space-y-3 rounded-md border border-border p-4"
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
                        className="space-y-1.5 rounded-md border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Opinion tier — never SeverityChip (axe severity vocab). */}
                          <span className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
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

      {/* Axe findings */}
      {sortedAxeFindings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Accessibility issues (axe-core)
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
              <span className="text-[var(--primary)]">›</span>
              <span>verdicts — deterministic, cited to WCAG</span>
              <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
                {sortedAxeFindings.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {sortedAxeFindings.map((f) => (
                <div key={f.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SeverityChip severity={f.severity} />
                    <span className="text-sm font-medium text-card-foreground">
                      {f.title}
                    </span>
                  </div>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                  <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                    {f.recommendation}
                  </p>
                  {formatLocation(f.page_url) && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      <span className="select-none">found at&nbsp;</span>
                      {formatLocation(f.page_url)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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
