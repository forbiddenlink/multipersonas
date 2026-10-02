import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SampleCoverSheet } from "@/components/dossier/sample-cover-sheet";
import { SampleTaskSuccess } from "@/components/dossier/sample-task-success";
import { GradeFindingRow } from "@/components/dossier/grade-finding-row";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { SAMPLE_SEVERITY_COUNTS, SAMPLE_TARGET, SAMPLE_VERDICTS } from "@/lib/sample-evidence";
import { SAUCEDEMO_TRAIL } from "@/lib/probe-ledger";

export const metadata: Metadata = {
  alternates: { canonical: "/sample-report" },
  title: "Sample accessibility report",
  description:
    "A full sample client report from a real probe of the SauceDemo test store: findings, fixes, persona task-success, and what a free grade doesn't cover.",
};

// axe-core 4.13.0 — the version resolved in pnpm-lock.yaml for this workspace
// (transitive via @axe-core/playwright). Not user-editable copy; keep in sync with the
// lockfile if the engine's axe-core dependency moves.
const AXE_VERSION = "4.13.0";
const PREPARED_ON = "September 2026";

const TOTAL_VIOLATIONS: number = Object.values(SAMPLE_SEVERITY_COUNTS).reduce(
  (a: number, b: number) => a + b,
  0,
);

const FIX_FIRST = [
  {
    ruleId: SAMPLE_VERDICTS[1].ruleId,
    severity: SAMPLE_VERDICTS[1].severity,
    reason: "Blocks the sort control on the main product list, the first thing a signed-in shopper touches.",
  },
  {
    ruleId: SAMPLE_VERDICTS[0].ruleId,
    severity: SAMPLE_VERDICTS[0].severity,
    reason: "Blocks recovery from a checkout error, the highest-cost place to lose a customer.",
  },
] as const;

export default function SampleReportPage() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />

      <main id="main" className="exhibits flex-1">
        <div className="report-print-root frame-narrow py-14 sm:py-20">
          <ExhibitHead label="Sample report" className="report-print-hide" />
          <p className="redline-note mt-2 max-w-xl leading-relaxed">
            Sample report. Real probe of the SauceDemo test store, not a customer.
          </p>
          <div className="report-print-hide mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/grade"
              className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Grade your own site free
            </Link>
            <span className="text-sm text-muted-foreground">Public pages, no signup.</span>
          </div>

          <div className="sheet mt-6 p-6 sm:p-8">
            <SampleCoverSheet axeVersion={AXE_VERSION} preparedOn={PREPARED_ON} />

            {/* Executive summary */}
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="label-mono">Executive summary</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                The public pages scanned clean. {TOTAL_VIOLATIONS} violations were waiting in
                states that only exist once you sign in, sort the catalog, or trip a
                validation error.
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(Object.keys(SAMPLE_SEVERITY_COUNTS) as (keyof typeof SAMPLE_SEVERITY_COUNTS)[]).map((sev) => (
                  <div key={sev} className="border-t border-foreground pt-2">
                    <dt><SeverityChip severity={sev} /></dt>
                    <dd className="mt-1.5 font-mono text-2xl tabular-nums">{SAMPLE_SEVERITY_COUNTS[sev]}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Fix first */}
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="label-mono">Fix first</h2>
              <ol className="mt-3 space-y-3">
                {FIX_FIRST.map((item, i) => (
                  <li key={item.ruleId} className="flex gap-3">
                    <span className="display text-lg leading-none text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityChip severity={item.severity} />
                        <span className="font-mono text-xs text-muted-foreground">{item.ruleId}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Findings, in detail */}
            <section className="mt-8 border-t-2 border-foreground pt-6">
              <h2 className="label-mono">Findings · signed-in states</h2>
              <ul className="mt-3">
                {SAMPLE_VERDICTS.map((v) => (
                  <GradeFindingRow
                    key={v.ruleId}
                    ruleId={v.ruleId}
                    severity={v.severity}
                    help={v.help}
                    wcagAA
                    location={v.location}
                  />
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {SAMPLE_SEVERITY_COUNTS.critical - SAMPLE_VERDICTS.length} additional critical
                finding is logged in the raw probe below but not excerpted here.
              </p>
            </section>

            {/* State-by-state coverage: public vs behind-login */}
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="label-mono">Findings by state · public vs. behind-login</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                A URL-level scanner only ever sees the first row. The rest exist only after a
                session is established.
              </p>
              <ol className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
                {SAUCEDEMO_TRAIL.map((s, i) => (
                  <li key={s.path} className="flex min-w-0 flex-col bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`truncate font-mono text-[11px] uppercase tracking-[0.08em] ${
                          s.publicUrl ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {s.publicUrl ? "Public" : "Session only"}
                      </span>
                    </div>
                    <p className="mt-2.5 font-medium">{s.label}</p>
                    <p className="mt-2 border-t border-border pt-2">
                      {s.findings > 0 ? (
                        <SeverityChip severity="critical" />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">No violations</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Raw results and method:{" "}
                <a
                  href="https://github.com/forbiddenlink/multipersonas/tree/main/experiments/net-new-violations"
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  experiments/net-new-violations
                </a>
              </p>
            </section>

            {/* Persona task-success — AI opinion, clearly labeled */}
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="label-mono">Persona layer</h2>
              <p className="display mt-2 text-xl leading-snug">The report says what broke. This shows who it stopped.</p>
              <SampleTaskSuccess className="mt-5" />
            </section>

            {/* Method + limitations */}
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="label-mono">Method &amp; limitations</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Findings come from axe-core {AXE_VERSION} run at every state a signed-in
                  crawl reaches: page load, after login, after adding to cart, and on a
                  validation error. Deterministic: run it twice, get the same answer.
                </li>
                <li>
                  Automated checks cover a large share of WCAG failures but not all of them.
                  Manual keyboard and screen-reader review still matters; this report is not a
                  substitute for testing with disabled users.
                </li>
                <li>
                  Persona task-success is an AI browser agent&apos;s read of a final page state
                  and its own written opinion, never a WCAG verdict, and never mixed into the
                  findings above.
                </li>
                <li>
                  This is a public sample built from a real, published probe. It is not a
                  customer account and no credentials of any kind were used or stored.
                </li>
              </ul>
            </section>

            {/* CTA */}
            <section className="report-print-hide mt-8 flex flex-col gap-4 border-t-2 border-foreground pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Want this for your own site? Grade the public pages free, or see what an agency
                plan adds behind the login.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/grade"
                  className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  Grade a site free
                </Link>
                <Link href="/pricing" className="text-link self-center text-sm">
                  See pricing
                </Link>
              </div>
            </section>
          </div>

          <p className="report-print-hide mt-6 text-xs text-muted-foreground">
            Target: {SAMPLE_TARGET.host} · Source: {SAMPLE_TARGET.source}
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
