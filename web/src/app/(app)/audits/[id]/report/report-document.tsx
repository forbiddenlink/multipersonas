import { scanCoverageLines, hasCompleteScanCoverage } from "@/lib/scan-coverage";
import { taskEvidenceLabel, taskCheckDetails } from "@engine/tasks/definition";
import { PERSONA_DATA } from "@/lib/personas";
import type { ReportData, Severity } from "@/lib/report";
import { severityMeta, SEVERITY_ORDER } from "@/components/forensic/severity";
import { displayFinding } from "@/lib/finding-display";
import { groupPriority } from "@/lib/priority-groups";
import type { compareRunWithPrevious } from "@/lib/baseline";
import type { getProjectSchedule } from "@/lib/schedules";
import { buildExecutiveSummary } from "@/lib/report-summary";
import styles from "./report.module.css";
import { ConformanceTable } from "./conformance-table";

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
  "fails-automated",
  "passes-automated",
  "needs-manual-review",
] as const;
const CONFORMANCE_META = {
  "fails-automated": { label: "Fails automated checks", color: "#b91c1c" },
  "passes-automated": { label: "Passes automated checks", color: "#a16207" },
  "needs-manual-review": { label: "Needs manual review", color: "#4b5563" },
} as const;

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** The printable report paper. It fetches nothing, so the page (and any other renderer)
 * can draw the same document from the same data. */
export function ReportDocument({
  report,
  regression,
  schedule,
}: {
  report: ReportData;
  regression: Awaited<ReturnType<typeof compareRunWithPrevious>> | null;
  schedule: Awaited<ReturnType<typeof getProjectSchedule>> | null;
}) {
  const personaNames = report.personaIds.map(
    (pid) => PERSONA_DATA[pid as keyof typeof PERSONA_DATA]?.name ?? pid,
  );
  const totalViolations = report.verdicts.length;
  const manualReviewRows = report.conformance.rows.filter(
    (row) => row.status === "needs-manual-review",
  );
  // One row per rule, so the top five are five different problems.
  const priorityVerdicts = groupPriority(
    report.verdicts.map((v) => ({
      id: v.id,
      ruleId: v.ruleId,
      title: v.title,
      severity: v.severity,
      priorityScore: v.priorityScore,
      priorityReason: v.priorityReason,
      locations: v.locations,
    })),
    5,
  );

  const executiveSummary = buildExecutiveSummary(
    {
      scanCoverage: report.scanCoverage,
      severityCounts: report.severityCounts,
      locationCount: new Set(report.verdicts.flatMap((v) => v.locations)).size,
      fixFirstTitles: priorityVerdicts.map(
        (v) => displayFinding({ ruleId: v.ruleId, title: v.title, description: null, recommendation: null }).title,
      ),
      history: regression
        ? {
            comparisonComplete: regression.comparisonComplete,
            previousDate: regression.previous?.created_at ?? null,
            newCount: regression.newDefects.length,
            fixedCount: regression.cleared.length,
            stillOpenCount: regression.unchangedCount,
          }
        : null,
      personaSuccess:
        !report.task && report.personaImpact.length > 0
          ? {
              reached: report.personaImpact.filter((p) => p.goalCompleted).length,
              total: report.personaImpact.length,
            }
          : null,
      manualReviewCount: manualReviewRows.length,
      nextScanAt: schedule?.enabled ? schedule.next_run_at : null,
    },
    formatDate,
  );

  return (
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
          <h2 className={styles.sectionTitle}>Executive summary</h2>
          {executiveSummary.map((line) => (
            <p key={line} style={{ margin: "0 0 0.5rem" }}>{line}</p>
          ))}
        </section>

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
            report&apos;s findings.
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
          <h2 className={styles.sectionTitle}>Scan coverage</h2>
          {scanCoverageLines(report.scanCoverage).map((line, index) => <p key={index}>{line}</p>)}
        </section>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Findings by severity</h2>
          {totalViolations === 0 ? (
            <p className={styles.empty}>
              {hasCompleteScanCoverage(report.scanCoverage) ? "No accessibility violations were detected in the states checked." : "No violations were recorded; scan coverage is incomplete or unknown."}
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
              Personas are user-outcome evidence, not accessibility findings. They show which
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
                      {name} · {role} · {persona.steps} steps · {persona.verdictStates} {persona.verdictStates === 1 ? "verdict state" : "verdict states"}
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
            <table className={styles.table} data-stack tabIndex={0} aria-label="Fix first priorities" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" style={{ width: "12%" }}>Score</th>
                  <th role="columnheader" style={{ width: "34%" }}>Issue</th>
                  <th role="columnheader" style={{ width: "18%" }}>Severity</th>
                  <th role="columnheader" style={{ width: "36%" }}>Why first</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {priorityVerdicts.map((v) => {
                  const meta = SEVERITY_META[v.severity as Severity] ?? SEVERITY_META.minor;
                  return (
                    <tr role="row" key={v.key}>
                      <td role="cell" className={styles.sev} data-label="Score">{v.priorityScore}</td>
                      <td role="cell" data-label="Issue">
                        {displayFinding({ ruleId: v.ruleId, title: v.title, description: null, recommendation: null }).title}
                        {v.pages > 0 ? (
                          <div className={styles.ruleId}>
                            {v.issues} {v.issues === 1 ? "issue" : "issues"} on {v.pages} {v.pages === 1 ? "page or state" : "pages or states"}
                          </div>
                        ) : null}
                      </td>
                      <td role="cell" data-label="Severity" style={{ color: meta.color }}>{meta.label}</td>
                      <td role="cell" data-label="Why first">{v.priorityReason}</td>
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
            WCAG 2.2 AA criteria: automated results ({report.conformance.totalCriteria} criteria)
          </h2>
          <p className={styles.disclaimer}>
            This table is generated from <strong>deterministic axe-core</strong> results,
            not AI inference. It reports what automated checks found, not a conformance
            level: <strong>Fails automated checks</strong> means axe measured a violation,{" "}
            <strong>Passes automated checks</strong> means axe found none and a person still
            has to verify the criterion, and <strong>Needs manual review</strong> means axe
            cannot test it at all.
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
          <ConformanceTable rows={report.conformance.rows} meta={CONFORMANCE_META} />
        </section>

        {totalViolations > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Verdicts ({totalViolations})</h2>
            <table className={styles.table} data-stack tabIndex={0} aria-label="Verdicts" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" style={{ width: "32%" }}>Rule</th>
                  <th role="columnheader" style={{ width: "16%" }}>WCAG SC</th>
                  <th role="columnheader" style={{ width: "10%" }}>Severity</th>
                  <th role="columnheader" style={{ width: "20%" }}>Found at</th>
                  <th role="columnheader" style={{ width: "22%" }}>Recommendation</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {report.verdicts.map((v) => {
                  const meta =
                    SEVERITY_META[v.severity as Severity] ?? SEVERITY_META.minor;
                  const glyph = severityMeta(v.severity).glyph;
                  const shown = displayFinding(v);
                  return (
                    <tr role="row" key={v.id}>
                      <td role="cell" data-label="Rule">
                        <div className={styles.ruleTitle}>{shown.title}</div>
                        {v.ruleId && (
                          <div className={styles.ruleId}>Rule: {v.ruleId}</div>
                        )}
                        {shown.why ? <div className={styles.desc}>{shown.why}</div> : null}
                      </td>
                      <td role="cell" className={styles.sc} data-label="WCAG SC">
                        {v.criteria.length > 0 ? (
                          v.criteria.map((c) => (
                            <div key={c.code} title={c.name}>
                              <span className={styles.scCode}>{c.code}</span> {c.name}
                            </div>
                          ))
                        ) : (
                          <span className={styles.scDash}>–</span>
                        )}
                      </td>
                      <td role="cell" className={styles.sev} data-label="Severity" style={{ color: meta.color }}>
                        <span aria-hidden="true" className={styles.sevGlyph}>
                          {glyph}
                        </span>
                        {meta.label}
                      </td>
                      <td role="cell" className={styles.desc} data-label="Found at">
                        {v.locations.length > 0 ? (
                          v.locations.map((loc) => (
                            <div key={loc} className={styles.ruleId}>
                              {loc}
                            </div>
                          ))
                        ) : (
                          <span className={styles.scDash}>–</span>
                        )}
                      </td>
                      <td role="cell" className={styles.rec} data-label="Fix">
                        {shown.fix}
                        {shown.fix && shown.learnMore ? " " : null}
                        {shown.learnMore ? (
                          <a href={shown.learnMore} target="_blank" rel="noopener noreferrer" className={styles.learnMore}>
                            Learn more<span className="sr-only"> about {shown.title} (opens in a new tab)</span>
                          </a>
                        ) : null}
                      </td>
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
            <table className={styles.table} data-stack tabIndex={0} aria-label="Criteria that need manual testing" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" style={{ width: "24%" }}>Success criterion</th>
                  <th role="columnheader" style={{ width: "8%" }}>Level</th>
                  <th role="columnheader" style={{ width: "68%" }}>Manual check</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {manualReviewRows.map((row) => (
                  <tr role="row" key={row.code}>
                    <td role="cell" data-label="Criterion">
                      <strong>{row.code}</strong> {row.name}
                    </td>
                    <td role="cell" data-label="Level">{row.level}</td>
                    <td role="cell" data-label="Manual check">{row.remarks}</td>
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
  );
}
