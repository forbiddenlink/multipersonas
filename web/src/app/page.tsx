/* Concept brief: the inspected window (2026-11-12). Materials and tokens: components/home/home.css */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/forensic/wordmark";
import { GradeForm } from "@/components/grade-form";
import { PersonaLineup } from "@/components/dossier/persona-lineup";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { FocusGradeLink } from "@/components/focus-grade-link";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import { ResponsiveDisclosure } from "@/components/dossier/responsive-disclosure";
import { SampleTaskSuccess } from "@/components/dossier/sample-task-success";
import { SampleRunLedger, SampleStuckMoment } from "@/components/dossier/sample-run";
import { DoorStage } from "@/components/home/door-stage";
import { Placard } from "@/components/home/placard";
import { ReplayRecorder } from "@/components/home/replay-recorder";
import "@/components/home/home.css";
import { PROBE_LEDGER, SAUCEDEMO_TRAIL } from "@/lib/probe-ledger";
import { publicScanLetter } from "@/lib/home-placard";
import { PLANS } from "@/lib/plans";
import { isSoloCheckoutOpen } from "@/lib/founding-checkout";
import { LatestUpdate } from "@/components/latest-update";

// Canonical only — title/description are inherited from the root layout default.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Re-render daily so the 90-day hide on the latest-update line cannot go stale between deploys.
export const revalidate = 86400;

const PROCEDURE = [
  {
    title: "Save a session on your machine",
    body: "Log in once in a real browser. The session file stays on your laptop, mode 0600. Nothing is uploaded.",
    cmd: "personaudit auth https://app.client.com",
  },
  {
    title: "Crawl every reachable state",
    body: "Carts, dashboards, error screens, open menus: states that exist only after you do something.",
    cmd: "personaudit scan https://app.client.com --session ./session.json",
  },
  {
    title: "Get the axe-core verdict at each one",
    body: "Deterministic, cited to WCAG, merged so one broken component reads as one defect, not forty.",
    cmd: "→ report.md  ·  3 critical  ·  2 serious",
  },
  {
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
  { date: "Jun 28, 2025", text: "EU accessibility enforcement began." },
  { date: "Apr 26, 2027", text: "The US Title II web rule applies to larger governments." },
] as const;

const SAUCE = PROBE_LEDGER.find((r) => r.host === "saucedemo.com")!;

const BTN_LINK = "pa-btn";

/** Allow a line break only after "." and "-" so a hostname never splits mid-word. */
function breakHost(host: string) {
  return host.split(/(?<=[.-])/).map((part, i) => (
    <span key={i}>
      {i > 0 ? <wbr /> : null}
      {part}
    </span>
  ));
}

export default function Home() {
  const SOLO_OPEN = isSoloCheckoutOpen();
  const letter = publicScanLetter(SAUCE);
  return (
    <div className="pa-home report-paper-surface flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      {/* ── 1. Nav: wordmark and the one button. ── */}
      <header className="pa-nav">
        <div className="frame flex min-h-16 items-center justify-between gap-4 py-2">
          <Link href="/" className="rounded-sm text-foreground">
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login" className="text-link hidden min-h-11 items-center sm:inline-flex">
              Sign in
            </Link>
            <FocusGradeLink className={`${BTN_LINK} pa-btn-sm`}>Grade my site</FocusGradeLink>
          </div>
        </div>
      </header>

      <main id="main" className="exhibits flex-1">
        {/* ── 2. Hero: a session replay of a persona trying a goal, with the axe-core scan as its own lane. ── */}
        <section id="scan" aria-labelledby="hero-heading" className="scroll-mt-4">
          <div className="frame break-words pt-6 sm:pt-10">
            <div className="pa-hero-top">
              <div className="min-w-0">
                {/* LCP element: plain text, no animation. */}
                <h1 id="hero-heading" className="pa-hero-h">
                  See where a first-time visitor gets stuck on your site.
                </h1>
                <p className="mt-3 max-w-[40rem] text-base leading-relaxed sm:mt-4 sm:text-lg">
                  AI personas browse your site toward a goal, like finding pricing or checking
                  out. Below is one stored run you can scrub through, with the axe-core scan of
                  the same site kept in its own lane.
                </p>
              </div>
              <div className="pa-hero-form">
                <GradeForm />
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Persona walkthroughs are on Solo and up.{" "}
                  <Link href="/pricing" className="text-link">See plans</Link>.
                </p>
              </div>
            </div>
          </div>
          <div className="pa-rec-wrap mt-6 pb-14 sm:mt-8 lg:pb-20">
            <ReplayRecorder />
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              What personas are for: finding where a goal stalls. They do not find accessibility
              defects. That is axe-core&apos;s job, and it runs underneath every report.
            </p>
          </div>
        </section>

        {/* ── 3. Signature move: the placard and the kitchen door. ── */}
        <DoorStage />

        {/* ── 4. Persona runs: results with exhibit tabs. ── */}
        <section id="runs" aria-labelledby="persona-heading" className="section-y scroll-mt-20">
          <div className="frame">
            <ExhibitHead label="Persona runs · Solo and up" />
            <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <div className="min-w-0">
                <h2 id="persona-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.6rem)]">
                  Who got through, and where the rest stalled.
                </h2>
                <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                  You pick a goal, like finding the pricing page or buying as a guest. Each persona
                  browses your real site toward it and reports whether it got there. For every one
                  that stalls you get the screenshot at the stuck step and the persona&apos;s own
                  words. Clients don&apos;t act on a rule ID. They act on &ldquo;a first-time
                  visitor never found pricing.&rdquo;
                </p>
                <dl className="mt-8 max-w-md space-y-5">
                  <div className="border-t-2 border-dashed border-[var(--redline)] pt-4">
                    <dt className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-semibold">
                      Task success and persona notes <span className="redline-note">AI opinion</span>
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      What each persona reports about its own run. Labeled as AI opinion, never mixed
                      into the findings. A persona is an AI agent, not a stand-in for a real
                      customer, and not for a person with a disability. For real people, test with
                      them through{" "}
                      <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer" className="text-link">Fable</a>.
                    </dd>
                  </div>
                  <div className="border-t-2 border-foreground pt-4">
                    <dt className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-semibold">
                      Findings <SeverityChip severity="critical" ruleId="4.1.2" />
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      From axe-core. Run it twice, get the same answer. Cited to WCAG. The only
                      thing that goes into the evidence report.
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="min-w-0 space-y-8">
                <SampleStuckMoment />
                <SampleRunLedger />
                <ResponsiveDisclosure summary="Open the sample replay: saucedemo.com, 3 steps" className="min-w-0">
                  <SampleTaskSuccess />
                </ResponsiveDisclosure>
              </div>
            </div>

            <div className="mt-12 grid gap-4 border-t-2 border-foreground pt-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <h3 className="pa-h text-[clamp(1.8rem,3vw,2.4rem)]">
                Can an AI persona&apos;s verdict be trusted?
              </h3>
              <div className="min-w-0 space-y-3 leading-relaxed">
                <p>
                  We checked before building on it. On two sites with known answers, personas
                  never reported success on a goal that was impossible (0 of 10), and matched the
                  truth on 18 of 20 goals. Both misses were a persona giving up on a goal it could
                  have reached, not claiming a win it had not earned.
                </p>
                <p className="text-sm text-muted-foreground">
                  A small test: 20 goals, each run once, on a self-hosted Metabase and the
                  SauceDemo store. It shows the verdict is worth building on, not that it is
                  always right. A persona that says &ldquo;blocked&rdquo; can mean the site blocks
                  the goal or that it could not find the way.{" "}
                  <a
                    href="https://github.com/forbiddenlink/multipersonas/tree/main/experiments/task-success-validity"
                    className="text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read the method and results
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="mt-14">
              <p className="max-w-3xl text-[1.0625rem] leading-relaxed text-muted-foreground">
                Under every run is a scan that gives the same answer twice. Pages are checked with{" "}
                <span className="font-bold text-foreground">axe-core</span>, a widely used
                open-source accessibility engine that Google Lighthouse also uses, against WCAG 2.2
                A and AA, the web accessibility standard that laws and RFPs commonly point to.
                Automated checks find part of the problems; a person still has to review the rest.
              </p>
              <PersonaLineup className="mt-8 lg:mt-10" />
              <div className="mt-8 max-w-[34rem]">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Want to see a finished report first?{" "}
                  <Link href="/sample-report" className="text-link">Read a sample client report</Link>.
                  {SOLO_OPEN ? ` Grading is free. The hosted workspace starts at $${PLANS.solo.monthlyUsd} a month.` : null}
                </p>
                <LatestUpdate className="mt-4" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Behind the login: steel, the door open, the states on the other side. ── */}
        <section id="behind" aria-labelledby="behind-heading" className="pa-steel section-y scroll-mt-20">
          <div className="frame">
            <ExhibitHead label="behind the login, on your machine" />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <div className="min-w-0">
                <h2 id="behind-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.8rem)]">
                  Scan the signed-in states. Fail only on what is new.
                </h2>
                <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed">
                  A one-URL scan sees one page; your users see the whole flow. The free CLI logs in on
                  your machine, so the password never leaves it, and the CI gate fails only on new
                  defects. On the SauceDemo test store the public login page scanned clean. Three
                  defects were waiting in states that only exist after you sign in, add to cart, or
                  get something wrong.
                </p>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#e4e8ee]">
                  Behind-login scanning runs locally with the CLI. The hosted grade covers public
                  pages only.
                </p>
              </div>
              <ol className="pa-trail min-w-0" aria-label="States the crawl reached on the SauceDemo test store">
                {SAUCEDEMO_TRAIL.map((s) => (
                  <li key={s.path}>
                    <span className="pa-state-label">
                      {s.label}{" "}
                      <span className="pa-mono text-sm font-normal text-[#e4e8ee]">{s.path}</span>
                    </span>
                    <span className="pa-count" data-hit={s.findings > 0 ? "1" : "0"}>
                      {s.findings} {s.findings === 1 ? "issue" : "issues"}
                    </span>
                    <span className="pa-why">{s.why}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── 6. Probe ledger: the four real rows as a posted inspection log. ── */}
        <section id="ledger" aria-labelledby="ledger-heading" className="section-y scroll-mt-20">
          <div className="frame">
            <ExhibitHead label="Probe ledger" />
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <div className="min-w-0">
                <h2 id="ledger-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.6rem)]">
                  Four demo apps, scanned both ways.
                </h2>
                <p className="mt-5 max-w-sm leading-relaxed">
                  The last row found nothing new, and it stays in the log.
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
              <div className="pa-board min-w-0">
                <p className="pa-kicker pt-2 text-center">Inspection log</p>
                <table className="pa-log">
                  <caption className="sr-only">
                    Violations found by a public-page scan versus net-new violations found by a
                    session crawl. States counts the states the crawl drove past the entry page.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Target</th>
                      <th scope="col" className="num">Public<span className="hidden sm:inline"> scan</span></th>
                      <th scope="col" className="num">States</th>
                      <th scope="col" className="num">Net new</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROBE_LEDGER.map((r) => (
                      <tr key={r.host}>
                        <th scope="row">{breakHost(r.host)}</th>
                        <td className="num">{r.publicScan}</td>
                        <td className="num">{r.states}</td>
                        <td className="num net" data-zero={r.netNew > 0 ? "0" : "1"}>
                          {r.netNew > 0 ? `+${r.netNew}` : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Procedure: four CLI steps as a numbered wall sign. ── */}
        <section aria-labelledby="procedure-heading" className="section-y border-t border-[var(--pa-hair)]">
          <div className="frame grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="min-w-0">
              <h2 id="procedure-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.6rem)]">
                Four steps from login to a gated build.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                For developers. Scan signed-in flows with the free CLI; the session
                never leaves your machine. Open source, MIT licensed, and no overlay script on your site.
              </p>
              <p className="pa-mono mt-6 max-w-md overflow-x-auto border-2 border-foreground px-3 py-2 text-sm break-words">
                npx personaudit scan https://your.app
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                Full setup, including a ready-to-use GitHub Action:{" "}
                <Link href="/guides/ci-accessibility-gate" className="text-link">
                  the CI accessibility gate guide
                </Link>
                .
              </p>
            </div>
            <ol className="pa-sign min-w-0">
              {PROCEDURE.map((s) => (
                <li key={s.title}>
                  <h3 className="pa-h text-[clamp(1.5rem,2.4vw,2rem)]">{s.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{s.body}</p>
                  <code className="pa-cmd">{s.cmd}</code>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 8. Deliverable: a list on a clipboard, no cards. ── */}
        <section aria-labelledby="deliverable-heading" className="section-y border-t border-[var(--pa-hair)]">
          <div className="frame grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="min-w-0">
              <h2 id="deliverable-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.6rem)]">
                Built for the handoff, not the demo.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                A violation list is where the work starts. Each scan becomes something a client can
                read and a developer can close.
              </p>
              <Link href="/sample-report" className="text-link mt-5 inline-block">
                Read the sample report
              </Link>
            </div>
            <div className="pa-clipboard min-w-0">
              <div className="pa-paper">
                <ul className="pa-todo">
                  {DELIVERABLE.map((d) => (
                    <li key={d.term}>
                      <span className="col-start-2">
                        <span className="block text-lg font-bold">{d.term}</span>
                        <span className="block text-[0.9375rem] leading-relaxed text-muted-foreground">
                          {d.desc}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. Deadlines: two stamped signs. ── */}
        <section aria-labelledby="deadlines-heading" className="section-y border-t border-[var(--pa-hair)]">
          <div className="frame">
            <h2 id="deadlines-heading" className="pa-h text-[clamp(2.4rem,4.6vw,3.6rem)]">
              Two dates on the wall.
            </h2>
            <ul className="pa-stamps mt-8 list-none p-0">
              {DEADLINES.map((d) => (
                <li key={d.date} className="pa-stamp">
                  <p className="pa-wide text-[clamp(1.9rem,3.6vw,2.8rem)] leading-none">{d.date}</p>
                  <p className="mt-3 text-lg leading-snug">{d.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[0.9375rem] leading-relaxed">
              <Link href="/guides/accessibility-deadlines" className="text-link">All deadlines and sources</Link>. Not legal advice.
            </p>
          </div>
        </section>

        {/* ── 10. Close: the placard again, grade A, with the button. ── */}
        <section aria-labelledby="close-heading" className="border-t-[3px] border-foreground">
          <div className="frame grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-20">
            <div className="min-w-0">
              <h2 id="close-heading" className="pa-h text-[clamp(3rem,6.4vw,5.2rem)]">
                See where your next client&apos;s visitors get stuck.
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
                Grade the public site free now. Add persona runs on a paid plan to see who gets through.
                Run the CLI behind the login, locally, tonight. Hand over the report tomorrow.{" "}
                {SOLO_OPEN
                  ? `Enterprise platforms sell annual contracts; Solo is $${PLANS.solo.monthlyUsd} a month, and the CLI is free.`
                  : "The CLI is free."}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <FocusGradeLink className={BTN_LINK}>Grade a site free</FocusGradeLink>
                <Link href="/for-agencies" className="text-link inline-flex min-h-11 items-center text-[0.9375rem]">
                  Agency plans
                </Link>
              </div>
            </div>
            {letter ? (
              <Placard
                className="mx-auto w-full max-w-xs"
                letter={letter}
                head="Public scan"
                foot={
                  <>
                    saucedemo.com public page
                    <br />
                    {SAUCE.publicScan} issues
                  </>
                }
              />
            ) : null}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
