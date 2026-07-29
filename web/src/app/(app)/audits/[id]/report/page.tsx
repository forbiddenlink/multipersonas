import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { PERSONA_DATA } from "@/lib/personas";
import { buildReport, type Severity } from "@/lib/report";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { severityMeta, SEVERITY_ORDER } from "@/components/forensic/severity";
import { ExportButton } from "./export-button";
import styles from "./report.module.css";

export const metadata: Metadata = {
  title: "Accessibility report",
};

// The report card is a literal paper preview — fixed white background, dark ink,
// REGARDLESS of the app theme (see report.module.css header comment). So severity
// color here stays a print-safe hardcoded hex, never the themed `var(--severity-*)`
// tokens: those flip value with light/dark mode and are only verified AA against
// their own theme's background, not against a background that ignores the theme.
// The glyph (from the shared severity vocabulary) is a plain static character, so
// it's safe to reuse here for the same color+icon+text treatment as the rest of
// the design system.
const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#b91c1c" },
  serious: { label: "Serious", color: "#c2410c" },
  moderate: { label: "Moderate", color: "#a16207" },
  minor: { label: "Minor", color: "#4b5563" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

  const personaNames = report.personaIds.map(
    (pid) => PERSONA_DATA[pid as keyof typeof PERSONA_DATA]?.name ?? pid,
  );
  const totalViolations = report.verdicts.length;

  return (
    <div>
      {/* On-screen frame — a console-toolbar header, entirely hidden in print
          (report-print-hide). The report paper below is a fixed white/black
          preview independent of the app theme, so themed components (SeverityChip)
          live here in the chrome, never inside the print root. */}
      <div className={`${styles.toolbar} report-print-hide`}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <span className="text-[var(--primary)]">›</span>
          <span>report — accessibility compliance record</span>
          <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
            {report.runId}
          </span>
        </div>
        {totalViolations > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            {SEVERITY_ORDER.filter((sev) => report.severityCounts[sev] > 0).map((sev) => (
              <SeverityChip
                key={sev}
                severity={sev}
                ruleId={String(report.severityCounts[sev])}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/audits/${id}`} className={buttonVariants({ variant: "outline" })}>
            Back to audit
          </Link>
          <ExportButton />
        </div>
      </div>

      <article className={`${styles.report} report-print-root`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Personaudit Accessibility Report</h1>
          <p className={styles.meta}>
            Site: <strong>{report.url}</strong>
          </p>
          <p className={styles.meta}>Audit date: {formatDate(report.auditDate)}</p>
          <p className={styles.meta}>Report ID: {report.runId}</p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Scope &amp; methodology</h2>
          <p style={{ margin: "0 0 0.75rem" }}>
            Accessibility verdicts below are produced by{" "}
            <strong>axe-core</strong>, a deterministic testing engine, evaluated at each
            state reached while auditing <strong>{report.url}</strong>
            {personaNames.length > 0 && (
              <>
                {" "}as navigated by {personaNames.length} persona
                {personaNames.length === 1 ? "" : "s"} ({personaNames.join(", ")})
              </>
            )}
            . The personas reach the states; axe renders the verdict. Persona
            observations are usability opinion and are deliberately excluded from this
            compliance report.
          </p>
          <p className={styles.disclaimer}>
            Automated testing detects a subset of accessibility barriers and is{" "}
            <strong>not a substitute for testing with disabled people</strong>. For
            testing with real assistive-technology users, see{" "}
            <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer">
              Fable
            </a>
            . This report makes no claim of full conformance.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Summary</h2>
          {totalViolations === 0 ? (
            <p className={styles.empty}>
              No accessibility violations were detected at the states this audit reached.
              This is not a guarantee of full conformance — see methodology above.
            </p>
          ) : (
            <div className={styles.summary}>
              {SEVERITY_ORDER.map((sev) => (
                <div key={sev} className={styles.count}>
                  <div
                    className={styles.countNum}
                    style={{ color: SEVERITY_META[sev].color }}
                  >
                    <span aria-hidden="true" className={styles.countGlyph}>
                      {severityMeta(sev).glyph}
                    </span>
                    {report.severityCounts[sev]}
                  </div>
                  <div className={styles.countLabel}>{SEVERITY_META[sev].label}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {totalViolations > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Verdicts ({totalViolations})</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Rule</th>
                  <th style={{ width: "18%" }}>WCAG SC</th>
                  <th style={{ width: "12%" }}>Severity</th>
                  <th style={{ width: "30%" }}>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {report.verdicts.map((v) => {
                  const meta =
                    SEVERITY_META[v.severity as Severity] ?? SEVERITY_META.minor;
                  const glyph = severityMeta(v.severity).glyph;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className={styles.ruleTitle}>{v.title}</div>
                        {v.ruleId && (
                          <div className={styles.ruleId}>Rule: {v.ruleId}</div>
                        )}
                        <div className={styles.desc}>{v.description}</div>
                      </td>
                      <td className={styles.sc}>
                        {v.criteria.length > 0 ? (
                          v.criteria.map((c) => (
                            <div key={c.code} title={c.name}>
                              <span className={styles.scCode}>{c.code}</span> {c.name}
                            </div>
                          ))
                        ) : (
                          <span className={styles.scDash}>—</span>
                        )}
                      </td>
                      <td className={styles.sev} style={{ color: meta.color }}>
                        <span aria-hidden="true" className={styles.sevGlyph}>
                          {glyph}
                        </span>
                        {meta.label}
                      </td>
                      <td className={styles.rec}>{v.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <footer className={styles.footer}>
          <span>Generated by Personaudit · personaudit.com</span>
          <span>axe-core deterministic verdicts</span>
        </footer>
      </article>
    </div>
  );
}
