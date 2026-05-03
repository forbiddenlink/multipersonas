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

export interface AuditResponse {
  url: string;
  overallScore: number;
  personas: Array<{
    id: string;
    name: string;
    description: string;
    score: number;
    goalCompleted: boolean;
    totalSteps: number;
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

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function scoreRingColor(score: number): string {
  if (score >= 80) return "border-green-400";
  if (score >= 50) return "border-yellow-400";
  return "border-red-400";
}

function scoreBgGlow(score: number): string {
  if (score >= 80) return "shadow-green-400/20";
  if (score >= 50) return "shadow-yellow-400/20";
  return "shadow-red-400/20";
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

function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

const PERSONA_LABELS: Record<string, string> = {
  "first-time-visitor": "First-Time Visitor",
  "screen-reader-user": "Screen Reader User",
  "mobile-slow-connection": "Mobile / Slow",
};

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
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Results for{" "}
          <span className="text-foreground font-medium">{results.url}</span>
        </p>
        <div
          className={`flex items-center justify-center size-32 rounded-full border-4 ${scoreRingColor(results.overallScore)} shadow-lg ${scoreBgGlow(results.overallScore)}`}
        >
          <span
            className={`text-4xl font-bold tabular-nums ${scoreColor(results.overallScore)}`}
          >
            {results.overallScore}
          </span>
          <span className="sr-only">{scoreLabel(results.overallScore)}</span>
        </div>
        <p className="text-sm text-muted-foreground">Overall Score</p>
        <p className={`text-sm font-medium ${scoreColor(results.overallScore)}`}>{scoreLabel(results.overallScore)}</p>
      </div>

      {/* Persona Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {results.personas.map((persona) => (
          <Card key={persona.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{persona.name}</CardTitle>
                <span className={`text-lg font-bold tabular-nums ${scoreColor(persona.score)}`}>
                  {persona.score} <span className="text-xs font-normal">{scoreLabel(persona.score)}</span>
                </span>
              </div>
              <CardDescription>
                {PERSONA_LABELS[persona.id] || persona.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={persona.goalCompleted ? "secondary" : "destructive"}
                >
                  {persona.goalCompleted ? "Goal completed" : "Goal failed"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {persona.totalSteps} steps
                </span>
              </div>

              {persona.findings.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Top findings ({persona.findings.length} total)
                  </p>
                  {persona.findings.slice(0, 3).map((finding, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
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
                className="rounded-xl border border-border p-4 space-y-2"
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

      {/* Reset */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset}>
          Run another audit
        </Button>
      </div>
    </div>
  );
}
