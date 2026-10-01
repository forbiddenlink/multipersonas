import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import { WaitlistForm } from "@/components/waitlist-form";
import { UnlockFoundingAccessButton } from "@/components/unlock-founding-access-button";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd, faqSchema } from "@/components/json-ld";
import { isFoundingCheckoutOpen } from "@/lib/founding-checkout";

export const metadata: Metadata = {
  alternates: { canonical: "/for-agencies" },
  title: "For agencies: one case file per client site",
  description:
    "Run axe-core at every state your client sites reach, including behind the login, without a client password ever leaving your machine. A case file per client, white-labeled, with a retest that proves the fix landed.",
};

const FOUNDING_CHECKOUT_OPEN = isFoundingCheckoutOpen();

// The buyer's workflow, not the tool's internals: scan, hand over the case file, retest.
// Every claim here runs today. The one gap (hosted behind-login) is named as the gap,
// because it is what founding access funds.
const WORKFLOW = [
  {
    n: "1",
    title: "Scan the client site",
    body: "Save a browser session on your own machine, then run the CLI against the logged-in app: checkout, dashboard, the multi-step flows a page scanner never reaches. The client's password never leaves your laptop.",
    cmd: "personaudit scan https://client.app --session ./session.json",
  },
  {
    n: "2",
    title: "Hand over the case file",
    body: "The CLI writes a Markdown report from the behind-login run. Add the hosted workspace and it exports a verdicts-only compliance report under your agency's name, not ours.",
    cmd: "→ client-report.md · white-labeled export",
  },
  {
    n: "3",
    title: "Retest to prove the fix landed",
    body: "Baseline today's backlog, ship the fix, then scan again. New, cleared, and still-open findings between the two runs, so the client sees proof of progress, not just a promise.",
    cmd: "personaudit scan … --baseline base.json --fail-on serious",
  },
] as const;

// Fictional client domains — an illustration of the workspace layout, not real client
// data or a customer count.
const CLIENT_LEDGER = [
  { domain: "northwind-store.com", severity: null, note: "0 new · scanned 2m ago" },
  { domain: "meridian-clinic.com", severity: "serious", note: "3 findings · checkout, behind login" },
  { domain: "harborview-realty.com", severity: null, note: "0 new · scanned 1h ago" },
  { domain: "atlas-freight.io", severity: "moderate", note: "1 finding · contrast, dashboard" },
] as const;

const STAKES = [
  { fact: "$1,000,000", detail: "FTC settlement against an overlay vendor for claiming a script makes a site compliant.", cite: "1" },
  { fact: "Jun 28, 2025", detail: "European Accessibility Act enforcement began for products and services sold in the EU.", cite: "2" },
  { fact: "Apr 26, 2027", detail: "ADA Title II web rule applies to US state and local governments serving 50,000 or more people.", cite: "3" },
] as const;

const AGENCY_FAQS = [
  {
    question: "Is this an overlay widget?",
    answer:
      "No. Overlays inject a script onto the page and claim that makes the site compliant. Personaudit audits the real DOM with axe-core and hands you the evidence. We don't sell a fix; we sell the truth.",
  },
  {
    question: "Do you store my client's password?",
    answer:
      "No. Behind-login scanning runs in the CLI on your machine. A client password never leaves your laptop and never touches our servers. Hosted behind-login is not built yet; that is what founding access funds.",
  },
  {
    question: "What does founding access include?",
    answer: FOUNDING_CHECKOUT_OPEN
      ? "$199 a month for the hosted agency workspace that exists today: multi-site projects, scheduled re-scans, a CI gate, and a verdicts-only compliance report you can white-label. Behind-login stays in the CLI until the hosted pipeline ships. You can cancel any time from the billing portal."
      : "The hosted agency workspace that exists today: multi-site projects, scheduled re-scans, a CI gate, and a verdicts-only compliance report you can white-label. Behind-login stays in the CLI until the hosted pipeline ships. Founding access is a paid pre-order of that workspace; the price is named when checkout is live.",
  },
  {
    question: "How is this different from free axe, WAVE, or pa11y?",
    answer:
      "Personaudit combines axe-core findings with saved tasks, recorded browser evidence, and comparable retests. An AI agent attempts the task, and a separate check reads the final page for exact visible text. This does not establish human success or a completed transaction. Behind-login scanning is available separately through the CLI.",
  },
  {
    question: "Does this replace testing with disabled people?",
    answer:
      "No. Nothing automated does. We don't simulate disabled users. For that, work with Fable, who pay disabled testers. Personaudit covers the deterministic axe-core layer and labeled task success, then you still test with people.",
  },
] as const;

export default function ForAgenciesPage() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <JsonLd data={faqSchema(AGENCY_FAQS)} />
      <SiteHeader intent="waitlist" />

      <main id="main" className="exhibits flex-1">
        {/* ── Hero: the claim, one primary CTA, the at-a-glance strip. ── */}
        <section className="border-b border-border">
          <div className="frame grid gap-12 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:py-20">
            <div className="min-w-0">
              <p className="label-mono">For agencies and freelance studios</p>
              <h1 className="display mt-5 text-[clamp(2.3rem,4.8vw,3.8rem)] leading-[1.03]">
                Every client site is <span className="mark-sweep">your liability</span> now.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                Personaudit runs <span className="font-medium text-foreground">axe-core</span> at
                every state your client&apos;s site reaches, including behind the login and
                through checkout, then hands you a case file. Authenticated scans run in the
                CLI, so a client password never leaves your machine and never touches our
                servers. Not a widget bolted to the page. An actual audit.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Link href="#early-access" className={buttonVariants({ size: "lg" })}>
                  Start founding access
                </Link>
                <Link href="/sample-report" className="text-link self-start text-[0.9375rem] sm:self-center">
                  Read a sample client report
                </Link>
              </div>
              <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-5" aria-label="At a glance">
                <div>
                  <dt className="label-mono">Credentials</dt>
                  <dd className="mt-1 font-mono text-sm">Stay local</dd>
                </div>
                <div>
                  <dt className="label-mono">Reports</dt>
                  <dd className="mt-1 font-mono text-sm">White-label</dd>
                </div>
                <div>
                  <dt className="label-mono">Overlay</dt>
                  <dd className="mt-1 font-mono text-sm">None</dd>
                </div>
              </dl>
            </div>

            <div className="sheet min-w-0 p-6 sm:p-8">
              <p className="label-mono">Why this year</p>
              <ol className="mt-4 divide-y divide-border border-t border-border">
                {STAKES.map((s) => (
                  <li key={s.fact} className="grid gap-1 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
                    <p className="font-mono text-sm tabular-nums text-[var(--redline)]">
                      {s.fact}
                      <sup className="ml-0.5 text-[11px] text-muted-foreground">{s.cite}</sup>
                    </p>
                    <p className="text-[0.9375rem] leading-relaxed">{s.detail}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                The widget a client already paid for isn&apos;t a defense. Sources below.
              </p>
            </div>
          </div>
        </section>

        {/* ── Workflow: scan, hand over the case file, retest to prove the fix. ── */}
        <section aria-labelledby="workflow-heading" className="section-y">
          <div className="frame">
            <ExhibitHead label="Your workflow" />
            <h2 id="workflow-heading" className="display mt-8 max-w-2xl text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              Three steps to a case file you can put in front of a client.
            </h2>
            <ol className="mt-10 border-t border-border">
              {WORKFLOW.map((w) => (
                <li
                  key={w.n}
                  className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.15fr)] md:gap-8"
                >
                  <span className="display text-3xl leading-none text-muted-foreground">{w.n}</span>
                  <div className="min-w-0">
                    <h3 className="text-[1.0625rem] font-semibold">{w.title}</h3>
                    <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{w.body}</p>
                  </div>
                  <pre
                    tabIndex={0}
                    role="region"
                    aria-label={`${w.title} command`}
                    className="min-w-0 self-start overflow-x-auto whitespace-pre rounded-sm border border-border bg-card px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    {w.cmd}
                  </pre>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted-foreground">
              Full setup, including a ready-to-use GitHub Action:{" "}
              <Link href="/guides/ci-accessibility-gate" className="text-link">
                the CI accessibility gate guide
              </Link>
              . Try the free path first on the{" "}
              <Link href="/#scan" className="text-link">
                homepage
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── One place, every client — the roster as a ledger, not cards. ── */}
        <section aria-labelledby="roster-heading" className="border-y border-border bg-card section-y">
          <div className="frame">
            <ExhibitHead label="One place, every client" className="mb-8" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <h2 id="roster-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                Stop re-running a single-site scanner twenty times.
              </h2>
              <p className="max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground lg:justify-self-end">
                Every client site becomes a project: scans, baseline, and history in one place.
                Scheduled re-scans run on the cadence you set, and each retest compares new,
                cleared, and still-open findings against the last run.
              </p>
            </div>

            <div
      tabIndex={0}
      role="region"
      aria-label="Client roster table"
      className="mt-10 min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
              <table className="w-full sm:min-w-[30rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Illustrative example of a multi-client project roster, not real client data
                </caption>
                <thead>
                  <tr className="border-b-2 border-foreground">
                    <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                      Client
                    </th>
                    <th scope="col" className="py-2 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                      Last scan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CLIENT_LEDGER.map((c) => (
                    <tr key={c.domain} className="border-b border-border">
                      <th scope="row" className="min-w-[10.5rem] py-3 pr-4 font-mono text-[13px] font-normal">
                        {c.domain}
                      </th>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {c.severity ? (
                            <SeverityChip severity={c.severity} />
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">No violations</span>
                          )}
                          <span className="text-xs text-muted-foreground">{c.note}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Illustrative example of the workspace layout. Not real client data.
            </p>
          </div>
        </section>

        {/* ── White-label: reports carry the agency's name, not ours. ── */}
        <section aria-labelledby="whitelabel-heading" className="section-y">
          <div className="frame">
          <ExhibitHead label="Agency founding" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <div>
              <h2 id="whitelabel-heading" className="display text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
                The report leaves with your name on it.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                A Solo export carries the Personaudit header. Agency founding replaces it with
                your studio&apos;s name, so the case file reads like something you produced, not
                a tool you resell.
              </p>
            </div>
            <div className="sheet min-w-0 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <p className="label-mono">Client report footer</p>
                <span className="font-mono text-[11px] text-muted-foreground">sample</span>
              </div>
              <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed">
                &ldquo;3 critical, 1 serious finding, cited to{" "}
                <WcagCitation code="4.1.2" /> and{" "}
                <WcagCitation code="1.4.3" />. Prepared for Meridian Clinic.&rdquo;
              </p>
              <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                Unlimited client projects and white-label export are agency founding only.
                Everything else on this page runs the same on Solo, one site at a time.{" "}
                <Link href="/pricing" className="text-link">
                  Compare plans
                </Link>
                .
              </p>
            </div>
          </div>
          </div>
        </section>

        {/* ── Honesty: not an overlay, not a substitute for disabled testers. ── */}
        <section aria-labelledby="honesty-heading" className="border-t border-border bg-card section-y">
          <div className="frame-narrow">
            <ExhibitHead label="Our position" />
            <h2 id="honesty-heading" className="display mt-8 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              We don&apos;t sell a fix. We sell the truth.
            </h2>
            <div className="mt-6 space-y-4 font-serif text-[1.0625rem] leading-relaxed text-muted-foreground">
              <p>
                No overlay. No claim that one line of JavaScript makes a site compliant. We
                audit the real DOM with axe-core, on public pages in the hosted product and
                behind login through the CLI, where credentials never leave your machine, and
                hand you exactly what&apos;s broken and where. Your client gets a report they
                can act on, or defend.
              </p>
              <p>
                We&apos;re honest about the limits too: axe-core renders the compliance verdict,
                and personas give usability opinion and task success, clearly marked as AI. We
                don&apos;t simulate disabled users, and nothing automated replaces testing with
                them. For that, work with{" "}
                <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer" className="text-link">
                  Fable
                </a>
                , who pay disabled testers.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section aria-labelledby="faq-heading" className="section-y">
          <div className="frame-narrow">
            <ExhibitHead label="Before you pay" />
            <h2 id="faq-heading" className="display mt-8 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              The questions a serious buyer actually asks.
            </h2>
            <div className="mt-10 border-t border-border">
              {AGENCY_FAQS.map((faq) => (
                <details key={faq.question} className="group border-b border-border py-6">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm font-medium [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
                    <span>{faq.question}</span>
                    <span aria-hidden="true" className="mt-0.5 shrink-0 font-mono text-muted-foreground">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="mt-2.5 max-w-2xl leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Early access / founding checkout. ── */}
        <section id="early-access" className="scroll-mt-20 border-t border-border bg-card section-y">
          <div className="frame">
          <ExhibitHead label="Founding access" />
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 className="display text-[clamp(1.9rem,4vw,3rem)] leading-[1.08]">
                {FOUNDING_CHECKOUT_OPEN
                  ? "$199 a month. One price, no sales call."
                  : "Help shape the agency workspace."}
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Keep every client project, its baseline, and its retests in one workspace.
                Schedule re-scans, review new and cleared findings, and export the report under
                your own name.
              </p>
              <div className="mt-6 border-t border-border pt-5">
                <p className="label-mono">What is and isn&apos;t built</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Behind-login scanning runs in the CLI today; your client&apos;s password never
                  leaves your machine. Running those scans hosted is not built yet. It is what
                  founding access funds. You can cancel any time from the billing portal.
                </p>
              </div>
              <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                {FOUNDING_CHECKOUT_OPEN
                  ? "Founding price is locked for as long as you stay. It goes up for everyone after."
                  : "Founding access opens shortly. Leave your email and you'll get the link first."}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Comparing tiers?{" "}
                <Link href="/pricing" className="text-link">
                  See the full pricing page
                </Link>
                .
              </p>
            </div>
            <div className="min-w-0">
              {FOUNDING_CHECKOUT_OPEN ? (
                <div className="sheet p-6 sm:p-8">
                  <p className="display text-[1.5rem] leading-tight">Start founding access</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    $199 a month, cancel any time. Sign in or create an account first, then
                    checkout takes about a minute.
                  </p>
                  <UnlockFoundingAccessButton className={`${buttonVariants({ size: "lg" })} mt-5 w-full`} />
                  <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
                    Not ready to commit? Tell us what would change that. A no is as useful to us
                    as a yes, and more honest than silence.
                  </p>
                  <div className="mt-4">
                    <WaitlistForm variant="feedback" />
                  </div>
                </div>
              ) : (
                <div className="sheet p-6 sm:p-8">
                  <WaitlistForm />
                </div>
              )}
            </div>
          </div>
          </div>
        </section>
      </main>

      <SiteFooter
        footnotes={
          <ol className="space-y-1 text-xs text-muted-foreground">
            <li>1. FTC v. accessiBe, settlement announced January 2025 (ftc.gov).</li>
            <li>2. European Accessibility Act, enforcement from 28 June 2025.</li>
            <li>
              3. ADA Title II web rule, interim final rule (Federal Register 2026-07663, April
              20, 2026). Standard: WCAG 2.1 AA. Not legal advice.
            </li>
          </ol>
        }
      />
    </div>
  );
}
