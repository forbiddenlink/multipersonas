import { taskEvidenceLabel, taskCheckDetails } from "@engine/tasks/definition";
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

// Print-safe conformance colors (same rationale as SEVERITY_META — hardcoded for the
// paper preview). Order is worst-first for the summary tiles.
const CONFORMANCE_STATUSES = [
  "does-not-support",
  "partially-supports",
  "needs-manual-review",
] as const;
const CONFORMANCE_META = {
  "does-not-support": { label: "Does Not Support", color: "#b91c1c" },
  "partially-supports": { label: "Partially Supports", color: "#a16207" },
  "needs-manual-review": { label: "Needs Manual Review", color: "#4b5563" },
} as const;

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
  const manualReviewRows = report.conformance.rows.filter(
    (row) => row.status === "needs-manual-review",
  );
  const csvRows = report.verdicts.map((v) => ({
    ruleId: v.ruleId,
    title: v.title,
    severity: v.severity,
    criteria: v.criteria.map((c) => `${c.code} ${c.name}`),
    locations: v.locations,
    recommendation: v.recommendation,
  }));
  const priorityVerdicts = [...report.verdicts]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return (
    <div>
      {/* On-screen frame — a console-toolbar header, entirely hidden in print
          (report-print-hide). The report paper below is a fixed white/black
          preview independent of the app theme, so themed components (SeverityChip)
          live here in the chrome, never inside the print root. */}
      <div className={`${styles.toolbar} report-print-hide`}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <span className="text-[var(--primary)]">›</span>
          <span>report: accessibility compliance record</span>
          <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
            {report.runId}
          </span>
        </div>
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
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/audits/${id}`} className={buttonVariants({ variant: "outline" })}>
            Back to audit
          </Link>
          <ExportButton
            csvRows={csvRows}
            filename={`personaudit-${report.runId}-verdicts.csv`}
          />
        </div>
      </div>

      <article className={`${styles.report} report-print-root`}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {report.agencyName
              ? `${report.agencyName} Accessibility Report`
              : "Personaudit Accessibility Report"}
          </h1>
          {report.clientName && (
            <p className={styles.meta}>
              Prepared for: <strong>{report.clientName}</strong>
            </p>
          )}
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
              This is not a guarantee of full conformance. See the methodology above.
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

        {report.task && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Task tested</h2>
            <p>{report.task.goal}</p>
            <p>Expected visible text: <q>{report.task.successText}</q></p>
            {report.task.version === 2 && report.task.expectedUrl && <p>Expected final URL: {report.task.expectedUrl}</p>}
            {report.task.version === 2 && report.task.requireNewText && <p>Text must be absent at the start and visible at the end.</p>}
            {report.taskOutcomes.length ? <ul>{report.taskOutcomes.map(({ personaId, evidence }) => (
              <li key={personaId}>
                {PERSONA_DATA[personaId as keyof typeof PERSONA_DATA]?.name ?? personaId}: {taskEvidenceLabel(report.task!, evidence)}
                {evidence.checks && <p>{taskCheckDetails(evidence)}</p>}
              </li>
            ))}</ul> : <p>No task evidence was saved for this run.</p>}
            <p>These are browser observations. They do not prove a transaction completed or predict human success.</p>
          </section>
        )}
        {!report.task && report.personaImpact.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{report.task ? "Task text-check results" : "Persona task-success impact"}</h2>
            <p className={styles.disclaimer}>
              Personas are user-outcome evidence, not compliance verdicts. They show which
              real-shaped flows reached the states where deterministic axe verdicts were captured.
            </p>
            <div className={styles.summary}>
              {report.personaImpact.map((persona) => {
                const name = PERSONA_DATA[persona.personaId as keyof typeof PERSONA_DATA]?.name ?? persona.personaId;
                const role = PERSONA_DATA[persona.personaId as keyof typeof PERSONA_DATA]?.role ?? "Persona";
                return (
                  <div key={persona.personaId} className={styles.count}>
                    <div className={styles.countNum} style={{ color: persona.goalCompleted ? "#137333" : "#b3261e" }}>
                      {report.task ? (persona.goalCompleted ? "Text observed" : "Not verified") : (persona.goalCompleted ? "Reached" : "Blocked")}
                    </div>
                    <div className={styles.countLabel}>
                      {name} · {role} · {persona.steps} steps · {persona.verdictStates} verdict states
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {priorityVerdicts.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Fix first</h2>
            <p className={styles.disclaimer}>
              Priority combines axe severity with persona task impact. It is a planning score,
              not a conformance score.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Score</th>
                  <th style={{ width: "34%" }}>Issue</th>
                  <th style={{ width: "18%" }}>Severity</th>
                  <th style={{ width: "36%" }}>Why first</th>
                </tr>
              </thead>
              <tbody>
                {priorityVerdicts.map((v) => {
                  const meta = SEVERITY_META[v.severity as Severity] ?? SEVERITY_META.minor;
                  return (
                    <tr key={v.id}>
                      <td className={styles.sev}>{v.priorityScore}</td>
                      <td>{v.title}</td>
                      <td style={{ color: meta.color }}>{meta.label}</td>
                      <td>{v.priorityReason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {report.fixClusters.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Remediation clusters</h2>
            <p className={styles.disclaimer}>
              Clustered by likely ownership so teams can turn violations into fix work.
              This is planning guidance; the verdict table remains the source of record.
            </p>
            <div className={styles.clusterGrid}>
              {report.fixClusters.map((cluster) => (
                <div key={cluster.id} className={styles.clusterCard}>
                  <div className={styles.clusterHeader}>
                    <h3>{cluster.label}</h3>
                    <span>{cluster.verdictCount}</span>
                  </div>
                  <p>{cluster.summary}</p>
                  <p className={styles.clusterStep}>{cluster.nextStep}</p>
                  <div className={styles.clusterSeverities}>
                    {SEVERITY_ORDER.filter((sev) => cluster.severities[sev] > 0).map((sev) => (
                      <span key={sev} style={{ color: SEVERITY_META[sev].color }}>
                        {SEVERITY_META[sev].label}: {cluster.severities[sev]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            WCAG 2.2 AA conformance ({report.conformance.totalCriteria} criteria)
          </h2>
          <p className={styles.disclaimer}>
            This conformance table is generated from <strong>deterministic axe-core</strong>{" "}
            results, not AI inference. Automation alone can never confirm full support: a
            criterion axe checks and finds clean is <strong>Partially Supports</strong>{" "}
            (manual verification still required), and a criterion axe cannot evaluate is{" "}
            <strong>Needs Manual Review</strong>. Only measured violations yield{" "}
            <strong>Does Not Support</strong>.
          </p>
          <div className={styles.summary}>
            {CONFORMANCE_STATUSES.map((s) => (
              <div key={s} className={styles.count}>
                <div className={styles.countNum} style={{ color: CONFORMANCE_META[s].color }}>
                  {report.conformance.counts[s]}
                </div>
                <div className={styles.countLabel}>{CONFORMANCE_META[s].label}</div>
              </div>
            ))}
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Success criterion</th>
                <th style={{ width: "8%" }}>Level</th>
                <th style={{ width: "22%" }}>Conformance</th>
                <th style={{ width: "30%" }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {report.conformance.rows.map((row) => (
                <tr key={row.code}>
                  <td>
                    <strong>{row.code}</strong> {row.name}
                  </td>
                  <td>{row.level}</td>
                  <td style={{ color: CONFORMANCE_META[row.status].color, whiteSpace: "nowrap" }}>
                    {CONFORMANCE_META[row.status].label}
                    {row.violationCount > 0 ? ` (${row.violationCount})` : ""}
                  </td>
                  <td>{row.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {totalViolations > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Verdicts ({totalViolations})</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Rule</th>
                  <th style={{ width: "16%" }}>WCAG SC</th>
                  <th style={{ width: "10%" }}>Severity</th>
                  <th style={{ width: "20%" }}>Found at</th>
                  <th style={{ width: "22%" }}>Recommendation</th>
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
                      <td className={styles.desc}>
                        {v.locations.length > 0 ? (
                          v.locations.map((loc) => (
                            <div key={loc} className={styles.ruleId}>
                              {loc}
                            </div>
                          ))
                        ) : (
                          <span className={styles.scDash}>—</span>
                        )}
                      </td>
                      <td className={styles.rec}>{v.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {manualReviewRows.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Manual review checklist ({manualReviewRows.length})
            </h2>
            <p className={styles.disclaimer}>
              axe-core cannot prove these criteria. Test them with keyboard navigation,
              assistive technology, and representative user tasks before making a
              conformance claim.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Success criterion</th>
                  <th style={{ width: "8%" }}>Level</th>
                  <th style={{ width: "68%" }}>Manual check</th>
                </tr>
              </thead>
              <tbody>
                {manualReviewRows.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.code}</strong> {row.name}
                    </td>
                    <td>{row.level}</td>
                    <td>{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className={styles.footer}>
          <span>
            {report.agencyName
              ? `Prepared by ${report.agencyName} · powered by Personaudit`
              : "Generated by Personaudit · personaudit.com"}
          </span>
          <span>axe-core deterministic verdicts</span>
        </footer>
      </article>
    </div>
  );
}
