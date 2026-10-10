/* Hallmark · genre: editorial · macrostructure: Long Document (case file) · design-system: DESIGN.md · designed-as-app */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";
import { ContentCodeBlock } from "@/components/dossier/content-code-block";
import { EvidenceSheet } from "@/components/dossier/evidence-sheet";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { FocusGradeLink } from "@/components/focus-grade-link";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import { ProcedureSteps } from "@/components/dossier/procedure-steps";
import { ResponsiveDisclosure } from "@/components/dossier/responsive-disclosure";
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





export default function Home() {
  const SOLO_OPEN = isSoloCheckoutOpen();
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />

      <main id="main" className="exhibits flex-1">
        {/* ── Hero: the claim and the free grade on the left, the finished case file on the right. ── */}
        <section id="scan" aria-labelledby="hero-heading" className="grain relative scroll-mt-20 overflow-hidden border-b border-border">
          <div className="frame relative z-10 grid gap-12 pt-12 pb-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] lg:items-center lg:gap-14 lg:pt-14 lg:pb-16">
            <div className="min-w-0">
              <p className="label-mono">For agencies, freelancers, and dev teams</p>
              {/* LCP element: the sweep animates a background only, never the text. */}
              <h1 id="hero-heading" className="display mt-4 text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.03] sm:mt-5">
                <span className="block">Grade your client&apos;s website.</span>
                <span className="block">Know <span className="mark-sweep">what to fix first.</span></span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-lg leading-relaxed text-muted-foreground sm:mt-6">
                Paste a web address. In under a minute you get an accessibility grade, what to fix
                first, and a page to show your client. Your first grade is free, with no account.
              </p>
              <div className="mt-6 max-w-[34rem] sm:mt-8">
                <GradeForm />
              </div>
              <p className="mt-6 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">
                Pages are checked with <span className="font-medium text-foreground">axe-core</span>,
                a widely used open-source accessibility engine that Google Lighthouse also uses,
                against WCAG 2.2 A and AA, the web accessibility standard that laws and RFPs
                commonly point to. Automated checks find part of the problems; a person still has to
                review the rest.
              </p>
              <p className="mt-4 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">
                Want to see a finished report first?{" "}
                <Link href="/sample-report" className="text-link">Read a sample client report</Link>.
                {SOLO_OPEN ? ` Grading is free. The hosted workspace starts at $${PLANS.solo.monthlyUsd} a month.` : null}
              </p>
            </div>

            <EvidenceSheet className="mx-auto hidden w-full max-w-[34rem] md:block lg:mr-0" />
          </div>
        </section>

        {/* ── Where scanners stop: the SauceDemo trail, state by state. ── */}
        <section id="behind" aria-labelledby="behind-heading" className="section-y scroll-mt-20">
          <div className="frame">
            <ExhibitHead label="Where scanners stop" className="mb-8" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <h2 id="behind-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                The homepage passes. The bugs are behind the login.
              </h2>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground lg:justify-self-end">
                A scanner that takes one URL sees one page; your users see the whole flow. We ran
                both on the SauceDemo test store. The public login page scanned clean. Three
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
              <ResponsiveDisclosure summary="Probe ledger: four demo apps, scanned both ways" className="min-w-0">
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
                      <th scope="col" className="py-2 pr-4 font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Target</th>
                      <th scope="col" className="py-2 pr-4 text-right font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Public<span className="hidden sm:inline"> scan</span></th>
                      <th scope="col" className="hidden py-2 pr-4 text-right font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">States</th>
                      <th scope="col" className="py-2 text-right font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Net new</th>
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
              </ResponsiveDisclosure>
            </div>
          </div>
        </section>

        {/* ── Procedure: a full-bleed terminal band, no exhibit tab. ── */}
        <section aria-labelledby="procedure-heading" className="section-y bg-foreground text-background">
          <div className="frame">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
              <h2 id="procedure-heading" className="display max-w-2xl text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                Four steps from login to a gated build.
              </h2>
              <p className="max-w-xl leading-relaxed text-[color-mix(in_oklch,var(--background)_74%,var(--foreground))]">
                For developers. Scan signed-in flows with the free CLI; the session
                never leaves your machine. Open source, MIT licensed, and no overlay script on your
                site.
              </p>
            </div>
            <ProcedureSteps steps={PROCEDURE} variant="terminal" className="mt-10" />
            <div className="mt-10 max-w-2xl">
              <ContentCodeBlock label="behind the login, on your machine" code="npx personaudit scan https://your.app" />
            </div>
            <p className="mt-6 text-sm text-[color-mix(in_oklch,var(--background)_74%,var(--foreground))]">
              Full setup, including a ready-to-use GitHub Action:{" "}
              <Link href="/guides/ci-accessibility-gate" className="underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--background)]">
                the CI accessibility gate guide
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── The deliverable: a single-column essay with one margin note, no exhibit tab. ── */}
        <section aria-labelledby="deliverable-heading" className="section-y-sm">
          <div className="frame grid gap-10 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:gap-20">
            <div className="min-w-0">
              <h2 id="deliverable-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                Built for the handoff, not the screenshot.
              </h2>
              <p className="mt-5 font-serif text-[1.125rem] leading-relaxed text-muted-foreground">
                A violation list is where the work starts. Each scan becomes something a client can
                read and a developer can close.
              </p>
              <ResponsiveDisclosure summary="What each report contains" className="mt-8">
              <dl className="border-t border-border">
                {DELIVERABLE.slice(0, -1).map((d) => (
                  <div key={d.term} className="grid gap-1 border-b border-border py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:py-4">
                    <dt className="font-semibold">{d.term}</dt>
                    <dd className="text-[0.9375rem] leading-relaxed text-muted-foreground">{d.desc}</dd>
                  </div>
                ))}
              </dl>
              </ResponsiveDisclosure>
            </div>
            <aside aria-label="Margin note" className="min-w-0 self-end border-l-2 border-dashed border-[var(--redline)] pl-5 lg:max-w-xs lg:self-start lg:pt-2">
              <p className="redline-note uppercase tracking-[0.1em]">{DELIVERABLE[DELIVERABLE.length - 1]!.term}</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                {DELIVERABLE[DELIVERABLE.length - 1]!.desc}
              </p>
              <Link href="/sample-report" className="text-link mt-4 inline-block">
                Read the sample report
              </Link>
            </aside>
          </div>
        </section>

        {/* ── Persona layer: task success, the client story. ── */}
        <section aria-labelledby="persona-heading" className="section-y">
          <div className="frame">
            <ExhibitHead label="Persona layer · Solo and up" />
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <h2 id="persona-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                The grade says what broke. A persona run says whether the job got done.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                A persona task-success run sends an AI agent to try a task on your site, like
                finding the pricing page, and records whether it got there. Clients don&apos;t act
                on a rule ID. They act on &ldquo;the agent never found pricing.&rdquo; You get that
                sentence, with the run to back it up.
              </p>
              <dl className="mt-8 max-w-md space-y-5">
                <div className="border-t-2 border-foreground pt-4">
                  <dt className="flex items-center justify-between gap-3 font-semibold">
                    Findings <SeverityChip severity="critical" ruleId="4.1.2" />
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    From axe-core. Run it twice, get the same answer. Cited to WCAG. The only
                    thing that goes into the evidence report.
                  </dd>
                </div>
                <div className="border-t-2 border-dashed border-[var(--redline)] pt-4">
                  <dt className="flex items-center justify-between gap-3 font-semibold">
                    Persona notes <span className="redline-note uppercase tracking-[0.1em]">Opinion · AI</span>
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Labeled as AI opinion, never mixed into the findings. A persona is an AI agent,
                    not a stand-in for a person with a disability. For that, test with real people
                    through{" "}
                    <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer" className="text-link">Fable</a>.
                  </dd>
                </div>
              </dl>
            </div>
            <ResponsiveDisclosure summary="Open the sample replay: saucedemo.com, 3 steps" className="min-w-0">
              <SampleTaskSuccess />
            </ResponsiveDisclosure>
          </div>
          </div>
        </section>

        {/* ── Why now: one line; the dated table lives on /for-agencies. ── */}
        <section aria-label="Why this year" className="border-t border-border bg-card">
          <p className="frame py-6 text-[0.9375rem] leading-relaxed">
            <span className="font-mono text-sm tabular-nums text-[var(--redline)]">Jun 28, 2025</span>{" "}
            EU accessibility enforcement began.{" "}
            <span className="font-mono text-sm tabular-nums text-[var(--redline)]">Apr 26, 2027</span>{" "}
            the US Title II web rule applies to larger governments.{" "}
            <Link href="/guides/accessibility-deadlines" className="text-link">All deadlines and sources</Link>. Not legal advice.
          </p>
        </section>

        {/* ── Close. ── */}
        <section aria-labelledby="close-heading" className="border-t border-border">
          <div className="frame flex flex-col items-start gap-8 py-14 md:flex-row md:items-end md:justify-between md:py-20">
            <div>
              <h2 id="close-heading" className="display max-w-2xl text-[clamp(2.2rem,4.6vw,3.5rem)] leading-[1.02]">
                Open a case file on your next client.
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                Grade the public site now. Run the CLI behind the login, locally, tonight. Hand over the
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
