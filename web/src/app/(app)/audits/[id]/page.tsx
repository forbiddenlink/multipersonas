import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { scoreColor, scoreStrokeColor } from "@/lib/score";
import { formatLocation } from "@/lib/format-location";

export const metadata: Metadata = {
  title: "Audit details",
};

// Mirrors the severity treatment in audit-results.tsx (kept local — same pattern as
// audit-history.tsx's own successColor — rather than importing from a "use client" module).
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

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes this to the caller's own rows; a mismatched or missing id both
  // fall through to notFound() rather than leaking existence of other users' runs.
  const { data: run } = await supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids")
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

  const total = run.task_success_total ?? 0;
  const achieved = run.task_success_achieved ?? 0;
  const successPct = total === 0 ? 0 : Math.round((achieved / total) * 100);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Results for{" "}
          <span className="text-foreground font-medium">{run.url}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(run.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
        {axeFindings.length > 0 && (
          <Link
            href={`/audits/${run.id}/report`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export accessibility report
          </Link>
        )}
        <div className="relative flex items-center justify-center size-36">
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              stroke={scoreStrokeColor(successPct)}
              strokeDasharray={`${(successPct / 100) * 327} 327`}
            />
          </svg>
          <div className="flex flex-col items-center">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: scoreColor(successPct) }}
            >
              {achieved}
              <span className="text-muted-foreground">/{total}</span>
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Personas who achieved their goal
        </p>
      </div>

      {/* Persona findings */}
      {byPersona.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Persona findings</h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {[...byPersona.entries()].map(([personaId, list]) => {
              const meta = PERSONA_DATA[personaId as keyof typeof PERSONA_DATA];
              return (
                <div
                  key={personaId}
                  className="rounded-xl border border-border p-4 space-y-3"
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
                        className="rounded-lg border border-border p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: severityColor(f.severity) }}
                          />
                          <Badge variant={severityBadgeVariant(f.severity)}>
                            {severityLabel(f.severity)}
                          </Badge>
                          <span className="text-xs font-medium truncate">
                            {f.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {f.description}
                        </p>
                        {formatLocation(f.page_url) && (
                          <p className="text-xs text-muted-foreground/70">
                            Found at: {formatLocation(f.page_url)}
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
      {axeFindings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Accessibility Issues (axe-core)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {axeFindings.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-border p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={severityBadgeVariant(f.severity)}>
                    {severityLabel(f.severity)}
                  </Badge>
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <p className="text-xs text-muted-foreground/70">
                  {f.recommendation}
                </p>
                {formatLocation(f.page_url) && (
                  <p className="text-xs text-muted-foreground/70">
                    Found at: {formatLocation(f.page_url)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {findings.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No findings recorded for this audit.
        </p>
      )}
    </div>
  );
}
