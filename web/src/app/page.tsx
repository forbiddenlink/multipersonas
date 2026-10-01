/* Hallmark · genre: editorial · macrostructure: Long Document (case file) · design-system: DESIGN.md · designed-as-app */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";
import { EvidenceSheet } from "@/components/dossier/evidence-sheet";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { FocusGradeLink } from "@/components/focus-grade-link";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import { StateFlowTrail } from "@/components/dossier/state-flow-trail";
import { SampleTaskSuccess } from "@/components/dossier/sample-task-success";
import { PROBE_LEDGER } from "@/lib/probe-ledger";
import { PLANS } from "@/lib/plans";
import { isSoloCheckoutOpen } from "@/lib/founding-checkout";

// Canonical only — title/description are inherited from the root layout default.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PROCEDURE = [
  {
    n: "1",
    title: "Save a session on your machine",
    body: "Log in once in a real browser. The session file stays on your laptop, mode 0600. Nothing is uploaded.",
    cmd: "personaudit auth https://app.client.com",
  },
  {
    n: "2",
    title: "Crawl every reachable state",
    body: "Carts, dashboards, error screens, open menus: states that exist only after you do something.",
    cmd: "personaudit scan https://app.client.com --session ./session.json",
  },
  {
    n: "3",
    title: "Get the axe-core verdict at each one",
    body: "Deterministic, cited to WCAG, merged so one broken component reads as one defect, not forty.",
    cmd: "→ report.md  ·  3 critical  ·  2 serious",
  },
  {
    n: "4",
    title: "Gate CI on new defects only",
    body: "Baseline today's backlog, then fail the build only when something new ships.",
    cmd: "personaudit scan … --baseline base.json --fail-on serious",
  },
] as const;

const DELIVERABLE = [
  { term: "Fix first", desc: "The defects to clear before anything else, grouped by the component that owns them." },
  { term: "Status per finding", desc: "Open, assigned, fixed, accepted risk, or false positive, with a note for the handoff." },
  { term: "Copy as issue", desc: "One click turns a finding into a GitHub, Jira, or Linear issue body." },
  { term: "Retest compare", desc: "New, cleared, and still-open findings between two runs: proof of progress." },
  { term: "CSV and print", desc: "Export the verdicts, or print the report as a clean paper document." },
  { term: "Your name on it", desc: "Agency plans put your studio's name on the report, not ours." },
] as const;

const DEADLINES = [
  { date: "Jun 28, 2025", what: "European Accessibility Act enforcement began for products and services sold in the EU." },
  { date: "Apr 26, 2027", what: "ADA Title II web rule applies to US state and local governments serving 50,000 or more people." },
  { date: "Apr 26, 2028", what: "Title II applies to smaller governments and special districts. The standard is WCAG 2.1 AA." },
] as const;



export default function Home() {
  const SOLO_OPEN = isSoloCheckoutOpen();
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />

      <main id="main" className="exhibits flex-1">
        {/* ── Hero: the claim and the free grade on the left, the finished case file on the right. ── */}
        <section id="scan" aria-labelledby="hero-heading" className="grain relative scroll-mt-20 overflow-hidden border-b border-border">
          <div className="frame relative z-10 grid gap-12 pt-12 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:items-center lg:gap-16 lg:pt-16 lg:pb-20">
            <div className="min-w-0">
              <p className="label-mono">Accessibility evidence for agencies and dev teams</p>
              {/* LCP element: the sweep animates a background only, never the text. */}
              <h1 id="hero-heading" className="display mt-5 text-[clamp(2.5rem,4.6vw,3.9rem)] leading-[1.02]">
                <span className="block">Scan behind the login.</span>
                <span className="block"><span className="mark-sweep">Keep the password.</span></span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                Personaudit runs <span className="font-medium text-foreground">axe-core</span> at
                every state a signed-in crawl reaches: carts, checkouts, error screens. The session
                never leaves your machine, and the report is ready to hand to a client.
              </p>
              <div className="mt-8 max-w-[34rem]">
                <GradeForm />
              </div>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Signed-in flows run in the{" "}
                <Link href="/docs" className="text-link">free, keyless CLI</Link>. 
                Persona task-success on public flows is part of{" "}
                <Link href="/pricing" className="text-link">Solo</Link>. Want to see a finished
                report first?{" "}
                <Link href="/sample-report" className="text-link">Read a sample client report</Link>.
                {SOLO_OPEN ? ` Grading is free. The hosted workspace starts at $${PLANS.solo.monthlyUsd} a month.` : null}
              </p>
            </div>

            <EvidenceSheet className="mx-auto w-full max-w-[34rem] lg:mr-0" />
          </div>
        </section>

        {/* ── Where scanners stop: the SauceDemo trail, state by state. ── */}
        <section id="behind" aria-labelledby="behind-heading" className="section-y scroll-mt-20">
          <div className="frame">
            <ExhibitHead label="Where scanners stop" className="mb-8" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <h2 id="behind-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                A URL scanner sees one page. Your users see the whole flow.
              </h2>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground lg:justify-self-end">
                We ran both on the SauceDemo test store. The public login page scanned clean. Three
                critical defects were waiting in states that only exist after you sign in, add to
                cart, or get something wrong.
              </p>
            </div>

            <StateFlowTrail />

            {/* Probe ledger — every target, including the one where the crawl found nothing. */}
            <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <p className="label-mono">Probe ledger</p>
                <p className="mt-3 max-w-sm font-serif text-[1.125rem] leading-relaxed">
                  Four public demo apps, scanned both ways. The last row found nothing new, and it
                  stays in the table.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Method and raw results:{" "}
                  <a
                    href="https://github.com/forbiddenlink/multipersonas/tree/main/experiments/net-new-violations"
                    className="text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    experiments/net-new-violations
                  </a>
                </p>
              </div>
              <div
      tabIndex={0}
      role="region"
      aria-label="Probe ledger table"
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Violations found by a public-page scan versus net-new violations found by a
                    session crawl
                  </caption>
                  <thead>
                    <tr className="border-b-2 border-foreground">
                      <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Target</th>
                      <th scope="col" className="py-2 pr-4 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Public<span className="hidden sm:inline"> scan</span></th>
                      <th scope="col" className="hidden py-2 pr-4 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">States</th>
                      <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">Net new</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROBE_LEDGER.map((r) => (
                      <tr key={r.host} className="border-b border-border">
                        <th scope="row" className="py-3 pr-4 font-mono text-[12px] font-normal break-all sm:text-[13px]">{r.host}</th>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-muted-foreground">{r.publicScan}</td>
                        <td className="hidden py-3 pr-4 text-right font-mono tabular-nums text-muted-foreground sm:table-cell">{r.states}</td>
                        <td className="py-3 text-right font-mono tabular-nums">
                          {r.netNew > 0 ? (
                            <span className="font-semibold text-[var(--redline)]">+{r.netNew}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── Procedure: how a scan runs, with the command at each step. ── */}
        <section aria-labelledby="procedure-heading" className="section-y">
          <div className="frame">
            <ExhibitHead label="Procedure" />
            <h2 id="procedure-heading" className="display mt-8 max-w-2xl text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              Four steps from login to a gated build.
            </h2>
            <ol className="mt-10 border-t border-border">
              {PROCEDURE.map((p) => (
                <li
                  key={p.n}
                  className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.15fr)] md:gap-8"
                >
                  <span className="display text-3xl leading-none text-muted-foreground">{p.n}</span>
                  <div className="min-w-0">
                    <h3 className="text-[1.0625rem] font-semibold">{p.title}</h3>
                    <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                  <pre
                    tabIndex={0}
                    role="region"
                    aria-label={`${p.title} command`}
                    className="min-w-0 self-start whitespace-pre-wrap break-words rounded-sm sm:overflow-x-auto sm:whitespace-pre border border-border bg-card px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    {p.cmd}
                  </pre>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted-foreground">
              Full setup, including a ready-to-use GitHub Action:{" "}
              <Link href="/guides/ci-accessibility-gate" className="text-link">
                the CI accessibility gate guide
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── The deliverable: what exists in the app today. ── */}
        <section aria-labelledby="deliverable-heading" className="border-t border-border section-y">
          <div className="frame">
            <ExhibitHead label="The deliverable" />
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <h2 id="deliverable-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                Built for the handoff, not the screenshot.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                A violation list is where the work starts. Each scan becomes something a client can
                read and a developer can close.
              </p>
              <Link href="/sample-report" className="text-link mt-6 inline-block">
                Read the sample report
              </Link>
            </div>
            <dl className="grid min-w-0 gap-x-10 border-t border-border sm:grid-cols-2">
              {DELIVERABLE.map((d) => (
                <div key={d.term} className="border-b border-border py-5">
                  <dt className="font-semibold">{d.term}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
          </div>
        </section>

        {/* ── Two kinds of output, kept apart. ── */}
        <section aria-labelledby="honesty-heading" className="border-y border-border bg-card section-y">
          <div className="frame">
            <ExhibitHead label="Two kinds of output" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
              <h2 id="honesty-heading" className="display max-w-3xl text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                A finding and an opinion are different documents.
              </h2>
            <p className="max-w-sm lg:justify-self-end text-sm leading-relaxed text-muted-foreground">
              Personaudit does not simulate disabled users, and nothing here replaces testing with
              them. For that, work with{" "}
              <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer" className="text-link">
                Fable
              </a>
              .
            </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-14">
              <div className="min-w-0 border-t-2 border-foreground pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Findings</p>
                  <SeverityChip severity="critical" ruleId="4.1.2" />
                </div>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  From axe-core. Deterministic: run it twice, get the same answer. Cited to a WCAG
                  success criterion. The only output that goes into a compliance report.
                </p>
              </div>
              <div className="min-w-0 border-t-2 border-dashed border-[var(--redline)] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Persona notes</p>
                  <span className="redline-note uppercase tracking-[0.1em]">Opinion · AI</span>
                </div>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  AI browser agents try to finish a task, and a separate check reads the final page.
                  Useful for the client story. Never a compliance verdict, never mixed into the
                  findings.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── Persona layer: task success, the client story. ── */}
        <section aria-labelledby="persona-heading" className="section-y">
          <div className="frame">
            <ExhibitHead label="Persona layer · Solo and up" />
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <h2 id="persona-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                The report says what broke. The persona shows who it stopped.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Clients don&apos;t act on a rule ID. They act on &ldquo;a first-time buyer never
                found pricing.&rdquo; Personas give you that sentence, with the run to back it up.
              </p>
            </div>
            <div className="min-w-0">
              <SampleTaskSuccess />
            </div>
          </div>
          </div>
        </section>

        {/* ── Why now: dated, sourced. ── */}
        <section aria-labelledby="deadlines-heading" className="border-t border-border bg-card section-y-sm">
          <div className="frame">
            <ExhibitHead label="Why this year" />
          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
            <div>
              <h2 id="deadlines-heading" className="display text-[clamp(1.7rem,3vw,2.2rem)] leading-[1.1]">
                The deadlines are on the calendar.
              </h2>
            </div>
            <ol className="min-w-0 divide-y divide-border border-y border-border">
              {DEADLINES.map((d) => (
                <li key={d.date} className="grid gap-1 py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6">
                  <p className="font-mono text-sm tabular-nums text-[var(--redline)]">{d.date}</p>
                  <p className="text-[0.9375rem] leading-relaxed">{d.what}</p>
                </li>
              ))}
              <li className="py-4 text-sm text-muted-foreground">
                Sources and what to do this quarter:{" "}
                <Link href="/guides/accessibility-deadlines" className="text-link">
                  the deadlines guide
                </Link>
                . Not legal advice.
              </li>
            </ol>
          </div>
          </div>
        </section>

        {/* ── Close. ── */}
        <section aria-labelledby="close-heading" className="border-t border-border">
          <div className="frame flex flex-col items-start gap-8 py-20 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="close-heading" className="display max-w-2xl text-[clamp(2.2rem,4.6vw,3.5rem)] leading-[1.02]">
                Open a case file on your next client.
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                Grade the public site now. Run the CLI behind the login tonight. Hand over the
                report tomorrow.{" "}
                {SOLO_OPEN
                  ? `Enterprise platforms sell annual contracts; Solo is $${PLANS.solo.monthlyUsd} a month, and the CLI is free.`
                  : "The CLI is free."}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <FocusGradeLink
                className="inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Grade a site free
              </FocusGradeLink>
              <Link href="/for-agencies" className="text-link text-[0.9375rem] inline-flex min-h-10 items-center">
                Agency plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
