import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { BoxDivider } from "@/components/forensic/divider";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/audits";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { listGraderScansForUser } from "@/lib/grade";
import { ProAuditUpsell } from "@/components/pro-audit-upsell";
import { GradeHistory } from "@/components/grade-history";
import { SEVERITY_ORDER, type Severity } from "@/components/forensic/severity";

export const metadata: Metadata = {
  title: "Dashboard",
};

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›&nbsp;</span>
        scan · history · severity roll-up
      </p>

      {totalVerdicts > 0 ? (
        <>
          <BoxDivider label="severity roll-up" className="my-5" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
            <span className="font-mono text-xs text-muted-foreground">
              {totalVerdicts} axe verdict{totalVerdicts === 1 ? "" : "s"} · {audits.length} run
              {audits.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      ) : null}

      <BoxDivider label="new scan" className="my-5" />

      {canRunPersonas ? (
        <>
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>
            point it at any public URL
          </p>
          <AuditForm submitLabel="Run audit" />
        </>
      ) : (
        <ProAuditUpsell />
      )}

      <BoxDivider label="saved grades" className="my-5" />
      <GradeHistory grades={grades} />

      <BoxDivider label="recent runs" className="my-5" />

      <AuditHistory audits={audits} />
    </div>
  );
}
