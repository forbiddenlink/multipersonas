import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { FirstRunEmpty } from "@/components/forensic/first-run-empty";
import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/audits";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { listGraderScansForUser } from "@/lib/grade";
import { GradeHistory } from "@/components/grade-history";
import { formatShortDate, hostname } from "@/lib/format";
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
  const latestRun = audits[0] ?? null;

  const btn =
    "inline-flex h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

  return (
    <div className="max-w-6xl">
      <ExhibitHead label="Case desk" className="mb-5" />
      <h1 className="display text-2xl leading-tight text-foreground">Dashboard</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section aria-labelledby="latest-heading" className="min-w-0">
          <ExhibitHead label="Latest run" className="mb-4" />
          {latestRun ? (
            <div className="sheet px-5 py-5">
              <h2 id="latest-heading" className="display text-xl leading-snug text-foreground">
                {hostname(latestRun.url)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatShortDate(latestRun.created_at)}
              </p>
              <div className="mt-5 border-t border-border pt-4">
                <Link href={`/audits/${latestRun.id}`} className="text-link text-sm font-medium">
                  View latest run &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 id="latest-heading" className="sr-only">
                Latest run
              </h2>
              <FirstRunEmpty canRunHosted={canRunPersonas} />
            </>
          )}
        </section>

        <section aria-labelledby="scan-heading" className="min-w-0">
          <ExhibitHead label="New scan" className="mb-4" />
          <h2 id="scan-heading" className="sr-only">
            New scan
          </h2>
          {canRunPersonas ? (
            <AuditForm key={user?.id} userId={user?.id} submitLabel="Run audit" />
          ) : (
            <div className="sheet flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Persona task-success runs come with the Solo and Agency plans. The deterministic grade of a public site is free.
              </p>
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <Link href="/grade" className={btn}>
                  Run a free grade
                </Link>
                <Link href="/for-agencies#early-access" className="text-link text-sm">
                  See founding access
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="findings-heading" className="mt-10">
        <ExhibitHead label="Open findings" className="mb-4" />
        <h2 id="findings-heading" className="sr-only">
          Open findings by severity
        </h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Findings appear here after your first run.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SEVERITY_ORDER.map((sev) => (
                <div key={sev} className="sheet px-4 py-4">
                  <dt>
                    <SeverityChip severity={sev} />
                  </dt>
                  <dd className="display mt-3 text-3xl leading-none tabular-nums text-foreground">
                    {counts[sev]}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {totalVerdicts > 0
                ? `axe-core verdicts across your last ${audits.length} run${audits.length === 1 ? "" : "s"}.`
                : `No open accessibility findings across your last ${audits.length} run${audits.length === 1 ? "" : "s"}.`}
            </p>
          </>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="grades-heading" className="min-w-0">
          <ExhibitHead label="Saved grades" className="mb-4" />
          <h2 id="grades-heading" className="sr-only">
            Saved grades
          </h2>
          <GradeHistory grades={grades} />
        </section>
        <section aria-labelledby="runs-heading" className="min-w-0">
          <ExhibitHead label="Recent runs" className="mb-4" />
          <h2 id="runs-heading" className="sr-only">
            Recent runs
          </h2>
          <AuditHistory audits={audits} />
        </section>
      </div>
    </div>
  );
}
