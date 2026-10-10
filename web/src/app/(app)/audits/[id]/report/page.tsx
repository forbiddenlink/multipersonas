import { hasCompleteScanCoverage } from "@/lib/scan-coverage";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { buildReport } from "@/lib/report";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { SEVERITY_ORDER } from "@/components/forensic/severity";
import { compareRunWithPrevious } from "@/lib/baseline";
import { getProjectSchedule } from "@/lib/schedules";
import { TrackOnMount } from "@/components/track-on-mount";
import { ExportButton } from "./export-button";
import styles from "./report.module.css";
import { formatDate, ReportDocument } from "./report-document";

export const metadata: Metadata = {
  title: "Accessibility report",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes the underlying run to the caller; a missing or not-owned id both return
  // null → 404, never leaking that another user's run exists.
  const report = await buildReport(supabase, id);
  if (!report) notFound();

  const totalViolations = report.verdicts.length;
  const csvRows = report.verdicts.map((v) => ({
    ruleId: v.ruleId,
    title: v.title,
    severity: v.severity,
    criteria: v.criteria.map((c) => `${c.code} ${c.name}`),
    locations: v.locations,
    recommendation: v.recommendation,
  }));

  // History and schedule only exist for project runs. A failed history read drops the
  // comparison sentence rather than inventing one.
  const [regression, schedule] = report.projectId
    ? await Promise.all([
        compareRunWithPrevious(supabase, report.projectId, report.runId).catch(() => null),
        getProjectSchedule(supabase, report.projectId).catch(() => null),
      ])
    : [null, null];

  return (
    <div>
      <TrackOnMount event="report_opened" properties={{ findings: totalViolations }} />
      {/* On-screen frame — a console-toolbar header, entirely hidden in print
          (report-print-hide). The report paper below is a fixed white/black
          preview independent of the app theme, so themed components (SeverityChip)
          live here in the chrome, never inside the print root. */}
      <div className={`${styles.toolbar} report-print-hide`}>
        <div className="file-tab max-w-full flex-wrap gap-y-1">
          <span>Case {report.runId.slice(0, 8)}</span>
          <span className="text-foreground/70">·</span>
          <span className="min-w-0 break-all normal-case">{report.url}</span>
          <span className="text-foreground/70">·</span>
          <span className="normal-case">{formatDate(report.auditDate)}</span>
          <span className="ml-auto normal-case text-[var(--redline)]">·&nbsp;
            {!hasCompleteScanCoverage(report.scanCoverage) ? "Coverage incomplete or unknown" : totalViolations === 0 ? "No findings" : `${totalViolations} finding${totalViolations === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="sheet -mt-px overflow-hidden">
          {totalViolations > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              {SEVERITY_ORDER.filter((sev) => report.severityCounts[sev] > 0).map((sev) => (
                <span key={sev} className="inline-flex items-center gap-1.5">
                  <SeverityChip severity={sev} />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {report.severityCounts[sev]}
                  </span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Link href={`/audits/${id}`} className={buttonVariants({ variant: "outline" })}>
              Back to audit
            </Link>
            <ExportButton
              csvRows={csvRows}
              scanCoverage={report.scanCoverage}
              filename={`personaudit-${report.runId}-verdicts.csv`}
            />
            <p className="max-w-xs text-xs text-muted-foreground">
              In the print dialog, choose Save as PDF and turn off Headers and footers.
            </p>
          </div>
        </div>
      </div>


      <ReportDocument report={report} regression={regression} schedule={schedule} />
    </div>
  );
}
