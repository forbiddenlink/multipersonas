import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { BoxDivider } from "@/components/forensic/divider";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/audits";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { listGraderScansForUser } from "@/lib/grade";
import { GradeHistory } from "@/components/grade-history";
import { SEVERITY_ORDER, type Severity } from "@/components/forensic/severity";

export const metadata: Metadata = {
  title: "Dashboard",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [audits, plan, grades] = await Promise.all([
    listAudits(supabase, 20),
    getSessionPlan(supabase, user?.id ?? null),
    user ? listGraderScansForUser(user.id) : Promise.resolve([]),
  ]);
  const canRunPersonas = planAllowsPersonas(plan);

  // Severity roll-up across recent runs — axe verdicts only (never persona opinion).
  const runIds = audits.map((a) => a.id);
  const counts: Record<Severity, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };
  if (runIds.length > 0) {
    const { data: rows } = await supabase
      .from("findings")
      .select("severity")
      .eq("source", "axe")
      .in("test_run_id", runIds);
    for (const row of rows ?? []) {
      const sev = row.severity as Severity;
      if (sev in counts) counts[sev] += 1;
    }
  }
  const totalVerdicts = SEVERITY_ORDER.reduce((n, s) => n + counts[s], 0);
  const latestRun = audits[0] ?? null;

  return (
    <div className="max-w-2xl">
      <ExhibitHead label="Case desk" className="mb-5" />
      <h1 className="display text-2xl leading-tight text-foreground">Dashboard</h1>

      {latestRun ? (
        <div className="sheet mt-5 px-5 py-5">
          <p className="label-mono">Latest run</p>
          <p className="display mt-1.5 text-xl leading-snug text-foreground">
            {hostname(latestRun.url)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(latestRun.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>

          {totalVerdicts > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {SEVERITY_ORDER.map((sev) =>
                counts[sev] > 0 ? (
                  <span key={sev} className="inline-flex items-center gap-2">
                    <SeverityChip severity={sev} />
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {counts[sev]}
                    </span>
                  </span>
                ) : null,
              )}
              <span className="text-xs text-muted-foreground">
                open across your last {audits.length} run{audits.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No open accessibility findings across your last {audits.length} run
              {audits.length === 1 ? "" : "s"}.
            </p>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <Link href={`/audits/${latestRun.id}`} className="text-link text-sm font-medium">
              View latest run &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <EmptyPrompt
          className="mt-5"
          prompt="Run your first audit to see what needs attention."
          hint="Point a public URL at the form below and its findings land here."
        />
      )}

      <BoxDivider label="new scan" className="my-5" />

      {canRunPersonas ? (
        <AuditForm key={user?.id} userId={user?.id} submitLabel="Run audit" />
      ) : (
        <div className="sheet flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Persona task-success runs are part of Pro. The deterministic grade of a public site is free.
          </p>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <Link
              href="/grade"
              className="inline-flex h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Run a free grade
            </Link>
            <Link href="/for-agencies#early-access" className="text-link text-sm">
              See founding access
            </Link>
          </div>
        </div>
      )}

      <BoxDivider label="saved grades" className="my-5" />
      <GradeHistory grades={grades} />

      <BoxDivider label="recent runs" className="my-5" />
      <AuditHistory audits={audits} />
    </div>
  );
}
