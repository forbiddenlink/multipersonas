"use client";

import { TaskEvidencePanel } from "@/components/task-evidence";
import type { TaskDefinition, TaskOutcome } from "@engine/tasks/definition";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { formatLocation } from "@/lib/format-location";
import { SEVERITY_ORDER } from "@/components/forensic/severity";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";

export interface AuditResponse {
  /** The saved run (test_runs.id). Set by the worker for signed-in runs; absent for anonymous
   * runs and for jobs finished before this field existed, so every reader treats it as optional. */
  runId?: string;
  task?: TaskDefinition | null;
  taskOutcomes?: TaskOutcome[];
  url: string;
  /**
   * How many personas got what they came for. This replaced a 0-100 composite
   * that was always 0 on any real application — see the orchestrator.
   */
  taskSuccess: { achieved: number; total: number };
  personas: Array<{
    id: string;
    name: string;
    description: string;
    goalCompleted: boolean;
    totalSteps: number;
    statesReached: number;
    findings: Array<{
      severity: string;
      category: string;
      title: string;
      description: string;
      recommendation: string;
      /** The state (page URL) the finding was observed in, when known. */
      location?: string;
    }>;
  }>;
  axeFindings: Array<{
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    /** The state(s) the finding was observed in, when known. */
    location?: string;
  }>;
  conflicts: Array<{ description: string; suggestion: string }>;
}

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

export function AuditResults({
  results,
  onReset,
  compact = false,
}: {
  results: AuditResponse;
  onReset: () => void;
  /** Constrain to dashboard/scan column width; left-align header. */
  compact?: boolean;
}) {
  const shell = compact ? "w-full space-y-8" : "w-full max-w-5xl mx-auto space-y-10";

  return (
    <div className={shell}>
      <TaskEvidencePanel task={results.task} outcomes={results.taskOutcomes} />
      <div className={compact ? "space-y-3" : "flex flex-col items-center gap-4 text-center"}>
        <p className="text-sm text-muted-foreground">
          Results for{" "}
          <span className="font-mono text-foreground break-all">{results.url}</span>
        </p>
        <Meter
          className={compact ? "w-full max-w-sm" : "w-full max-w-xs"}
          value={results.taskSuccess.achieved}
          total={results.taskSuccess.total}
          label={results.task ? "expected text observed" : "task success"}
          unit={results.task ? "profiles matched the check" : "personas reached their goal"}
          tone={successTone(results.taskSuccess.achieved, results.taskSuccess.total)}
        />
        {results.axeFindings.length > 0 ? (
          <div className={`flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
            {SEVERITY_ORDER.map((sev) => {
              const n = results.axeFindings.filter((f) => f.severity === sev).length;
              if (!n) return null;
              return (
                <span key={sev} className="inline-flex items-center gap-1.5">
                  <SeverityChip severity={sev} />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{n}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {results.personas.length > 0 && (
        <p className="redline-note text-center uppercase tracking-[0.1em]">Opinion · AI</p>
      )}
      <div className={`grid gap-4 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-3 gap-6"}`}>
        {results.personas.map((persona) => (
          <div key={persona.id} className="sheet space-y-3 p-4">
            <div>
              <p className="text-sm font-medium">{persona.name}</p>
              <p className="text-xs text-muted-foreground">
                {PERSONA_DATA[persona.id as keyof typeof PERSONA_DATA]?.role ?? persona.id}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
                style={{
                  color: persona.goalCompleted ? "var(--severity-minor)" : "var(--severity-critical)",
                  borderColor: `color-mix(in oklch, ${persona.goalCompleted ? "var(--severity-minor)" : "var(--severity-critical)"} 55%, transparent)`,
                }}
              >
                {results.task ? (persona.goalCompleted ? (results.task.version === 2 ? "Checks observed" : "Text observed") : "Not verified") : (persona.goalCompleted ? "Goal achieved" : "Blocked")}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {persona.totalSteps} step{persona.totalSteps === 1 ? "" : "s"} ·{" "}
                {persona.statesReached} state{persona.statesReached === 1 ? "" : "s"}
              </span>
            </div>

            {persona.findings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  UX observations ({persona.findings.length}), AI judgement
                </p>
                {persona.findings.slice(0, 3).map((finding, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-sm border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 label-mono">
                        AI observation
                      </span>
                      <span className="truncate text-xs font-medium">{finding.title}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {finding.description}
                    </p>
                    {formatLocation(finding.location) && (
                      <p className="font-mono text-xs text-muted-foreground">
                        found at {formatLocation(finding.location)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {persona.goalCompleted
                  ? "No UX observations"
                  : results.task ? "No matching text verified; no AI observations recorded" : "Blocked with no AI observations recorded"}
              </p>
            )}
          </div>
        ))}
      </div>

      {results.axeFindings.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="label-mono">Axe-core verdicts</p>
            <h3 className="display text-2xl leading-tight">Accessibility issues</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Deterministic, cited to WCAG.
            </p>
          </div>
          <div className="sheet overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 label-mono">
              <span>Showing</span>
              <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs tabular-nums normal-case text-muted-foreground">
                {results.axeFindings.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {results.axeFindings.map((finding, i) => (
                <div key={i} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SeverityChip severity={finding.severity} />
                    <span className="text-sm font-medium text-card-foreground">{finding.title}</span>
                  </div>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {finding.description}
                  </p>
                  <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                    {finding.recommendation}
                  </p>
                  {formatLocation(finding.location) && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      <span className="select-none">found at&nbsp;</span>
                      {formatLocation(finding.location)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {results.conflicts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Persona conflicts</h3>
          <div className="space-y-3">
            {results.conflicts.map((conflict, i) => (
              <div key={i} className="sheet space-y-2 p-4">
                <p className="text-sm">{conflict.description}</p>
                <p className="text-xs text-muted-foreground">
                  Suggestion: {conflict.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={`text-xs text-muted-foreground ${compact ? "" : "text-center"}`}>
        Persona usability notes were generated by AI (Claude) and may contain inaccuracies.
        Accessibility violations come from axe-core and are deterministic.
      </p>

      <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "justify-center"}`}>
        {results.runId ? (
          <>
            <Link href={`/audits/${results.runId}`} className={buttonVariants({ variant: "default" })}>
              Open the full run
            </Link>
            <Link href={`/audits/${results.runId}/report`} className={buttonVariants({ variant: "outline" })}>
              Open the report
            </Link>
          </>
        ) : null}
        <Button variant={results.runId ? "link" : "outline"} onClick={onReset}>
          Run another audit
        </Button>
      </div>
    </div>
  );
}
