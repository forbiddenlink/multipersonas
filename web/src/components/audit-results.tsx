"use client";

import { Button } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { formatLocation } from "@/lib/format-location";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";

export interface AuditResponse {
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
}: {
  results: AuditResponse;
  onReset: () => void;
}) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Overall Score */}
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          Results for{" "}
          <span className="font-mono text-foreground">{results.url}</span>
        </p>
        <Meter
          className="w-full max-w-xs"
          value={results.taskSuccess.achieved}
          total={results.taskSuccess.total}
          label="task success"
          unit="personas reached their goal"
          tone={successTone(results.taskSuccess.achieved, results.taskSuccess.total)}
        />
      </div>

      {/* Persona Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {results.personas.map((persona) => (
          <div key={persona.id} className="space-y-3 rounded-md border border-border p-4">
            <div>
              <p className="text-sm font-medium">{persona.name}</p>
              <p className="text-xs text-muted-foreground">
                {PERSONA_DATA[persona.id as keyof typeof PERSONA_DATA]?.role ?? persona.id}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Goal state — same chip formula as SeverityChip (color+border+bg via
                  color-mix), but not the shared component: this is a pass/fail state on
                  a persona's own goal, not an axe severity. */}
              <span
                className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
                style={{
                  color: persona.goalCompleted ? "var(--severity-minor)" : "var(--severity-critical)",
                  borderColor: `color-mix(in oklch, ${persona.goalCompleted ? "var(--severity-minor)" : "var(--severity-critical)"} 55%, transparent)`,
                }}
              >
                {persona.goalCompleted ? "Goal achieved" : "Blocked"}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {persona.totalSteps} steps · {persona.statesReached} states
              </span>
            </div>

            {persona.findings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  UX observations ({persona.findings.length}) &mdash; AI judgement
                </p>
                {persona.findings.slice(0, 3).map((finding, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-md border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={finding.severity} />
                      <span className="text-xs font-medium truncate">
                        {finding.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
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
                No issues found
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Axe Findings */}
      {results.axeFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">
            Accessibility issues (axe-core)
          </h3>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
              <span className="text-[var(--primary)]">›</span>
              <span>verdicts — deterministic, cited to WCAG</span>
              <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
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

      {/* Conflicts */}
      {results.conflicts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Persona conflicts</h3>
          <div className="space-y-3">
            {results.conflicts.map((conflict, i) => (
              <div
                key={i}
                className="space-y-2 rounded-md border border-border p-4"
              >
                <p className="text-sm">{conflict.description}</p>
                <p className="text-xs text-muted-foreground">
                  Suggestion: {conflict.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI disclosure */}
      <p className="text-center text-xs text-muted-foreground">
        These findings were generated by AI (Claude) and may contain inaccuracies. Verify critical issues manually before making changes.
      </p>

      {/* Reset */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset}>
          Run another audit
        </Button>
      </div>
    </div>
  );
}
