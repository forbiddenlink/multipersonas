"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { scoreColor, scoreStrokeColor } from "@/lib/score";

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
    }>;
  }>;
  axeFindings: Array<{
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  conflicts: Array<{ description: string; suggestion: string }>;
}

function severityBadgeVariant(
  severity: string
): "destructive" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "serious":
      return "destructive";
    case "moderate":
      return "secondary";
    default:
      return "outline";
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "var(--severity-critical)";
    case "serious":
      return "var(--severity-serious)";
    case "moderate":
      return "var(--severity-moderate)";
    default:
      return "var(--severity-minor)";
  }
}

function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function AuditResults({
  results,
  onReset,
}: {
  results: AuditResponse;
  onReset: () => void;
}) {
  // Drives the arc and its colour only. The label shows the real fraction —
  // "0 of 3" is the finding, and rounding it to a percentage would hide that.
  const successPct =
    results.taskSuccess.total === 0
      ? 0
      : Math.round((results.taskSuccess.achieved / results.taskSuccess.total) * 100);
  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Overall Score */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Results for{" "}
          <span className="text-foreground font-medium">{results.url}</span>
        </p>
        <div className="relative flex items-center justify-center size-36">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              strokeWidth="6" strokeLinecap="round"
              stroke={scoreStrokeColor(successPct)}
              strokeDasharray={`${(successPct / 100) * 327} 327`}
              className="transition-all duration-1000 ease-out"
              style={{ animationDelay: "200ms" }}
            />
          </svg>
          <div className="flex flex-col items-center">
            <span className={`text-4xl font-bold tabular-nums ${scoreColor(successPct)}`}>
              {results.taskSuccess.achieved}<span className="text-muted-foreground">/{results.taskSuccess.total}</span>
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Personas who achieved their goal
        </p>
      </div>

      {/* Persona Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {results.personas.map((persona) => (
          <Card key={persona.id} className="transition-all duration-200 hover:scale-[1.02] hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{persona.name}</CardTitle>
              </div>
              <CardDescription>
                {PERSONA_DATA[persona.id as keyof typeof PERSONA_DATA]?.role ?? persona.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={persona.goalCompleted ? "secondary" : "destructive"}
                >
                  {persona.goalCompleted ? "Goal achieved" : "Blocked"}
                </Badge>
                <span className="text-xs text-muted-foreground">
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
                      className="rounded-lg border border-border p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: severityColor(finding.severity) }} />
                        <Badge variant={severityBadgeVariant(finding.severity)}>
                          {severityLabel(finding.severity)}
                        </Badge>
                        <span className="text-xs font-medium truncate">
                          {finding.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {finding.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No issues found
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Axe Findings */}
      {results.axeFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Accessibility Issues (axe-core)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.axeFindings.map((finding, i) => (
              <div
                key={i}
                className="rounded-xl border border-border p-4 space-y-2 transition-all duration-200 hover:border-primary/20"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={severityBadgeVariant(finding.severity)}>
                    {severityLabel(finding.severity)}
                  </Badge>
                  <span className="text-sm font-medium">{finding.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {finding.description}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {finding.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts */}
      {results.conflicts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Persona Conflicts</h3>
          <div className="space-y-3">
            {results.conflicts.map((conflict, i) => (
              <div
                key={i}
                className="rounded-xl border border-border p-4 space-y-2"
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
