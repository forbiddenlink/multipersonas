import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WaitlistForm } from "@/components/waitlist-form";
import { FoundingCheckoutLink } from "@/components/founding-checkout-link";
import { Reveal } from "@/components/reveal";
import { AuditTerminal } from "@/components/audit-terminal";
import { ConsolePreview } from "@/components/forensic/console-preview";
import { ReportPaper } from "@/components/forensic/report-paper";
import { StatCount } from "@/components/forensic/stat-count";

export const metadata: Metadata = {
  alternates: { canonical: "/for-agencies" },
  title: "For agencies — one audit trail for every client site",
  description:
    "Run axe-core at every state your client sites reach, including behind the login, without a client password ever leaving your machine. Evidence reports per client. Real audits, not an overlay widget.",
};

// Fictional client domains — illustrative, not real client sites.
const SITES = [
  { domain: "northwind-store.com", status: "clean", note: "0 new · scanned 2m ago", ok: true },
  { domain: "meridian-clinic.com", status: "3 findings", note: "checkout · behind login", ok: false },
  { domain: "harborview-realty.com", status: "clean", note: "0 new · scanned 1h ago", ok: true },
  { domain: "atlas-freight.io", status: "1 finding", note: "contrast · dashboard", ok: false },
];

// The buyer's plan, not the tool's steps: what the first week actually looks like.
// Every claim here must be something that runs today. The one gap (hosted behind-login)
// is named as the gap, because it is what founding access funds.
const FIRST_WEEK: { when: string; title: string; body: string }[] = [
  {
    when: "day one",
    title: "Point it at one real client site",
    body:
      "Save a browser session on your own machine, then run the CLI against the logged-in app: checkout, dashboard, the multi-step flows a page scanner never reaches. The client's password never leaves your laptop, and nothing gets installed on their server.",
  },
  {
    when: "day two",
    title: "Put the gate in their pipeline",
    body:
      "Drop the CI check into that client's repo so a new violation fails the build instead of shipping to their users. The scan takes no API key, so it runs in CI without a secret to rotate.",
  },
  {
    when: "day three",
    title: "Hand over the evidence",
    body:
      "The CLI writes a Markdown report from the behind-login run. The hosted workspace exports a verdicts-only VPAT-lite report under your agency's name. Joining those two, so the behind-login run lands in the hosted report, is exactly what founding access funds.",
  },
];

const FOUNDING_CHECKOUT_URL = process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL;

export default function ForAgenciesPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader intent="waitlist" />

      <main id="main">
      {/* ── Hero: split ledger ─────────────────────────────────────────── */}
      <section
        className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
      >
        <div className="max-w-xl">
          <p className="fade-up flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground" style={{ animationDelay: "0.05s" }}>
            <span className="h-px w-8 bg-primary" />
            For agencies &amp; freelancers
          </p>
          {/* No entrance animation on the headline: it's the LCP element, so it must
              paint immediately rather than fade in from opacity:0. */}
          <h1 className="mt-6 font-heading text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-balance">
            Every client site is your liability now.
          </h1>
          <p className="fade-up mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: "0.19s" }}>
            Personaudit runs <span className="text-foreground">axe-core</span> at every state
            your client&apos;s site actually reaches, including behind the login and through
            checkout, then hands you the evidence report. Authenticated scans run in the CLI,
            so a client password never leaves your machine and never touches our servers.
            Not a widget bolted to the page. An actual audit.
          </p>
          <div className="fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "0.26s" }}>
            <Link
              href="#early-access"
              className="inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3 text-sm font-semibold text-background transition-[background-color] hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Get early access
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-sm px-4 py-3 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Try a free audit first
            </Link>
          </div>
        </div>

        {/* The product, visibly working — a persona auditing behind the login, live. */}
        <div className="fade-up lg:pl-2" style={{ animationDelay: "0.34s" }}>
          <AuditTerminal />
        </div>
      </section>

      {/* ── The stakes: overlay villain + numbers ──────────────────────── */}
      <Reveal className="border-y border-border bg-card">
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <p className="max-w-3xl font-heading text-[clamp(1.6rem,3.4vw,2.5rem)] leading-[1.15] text-balance">
            Hundreds of 2025&apos;s accessibility lawsuits hit sites that already had an
            accessibility{" "}
            <span className="text-muted-foreground line-through decoration-destructive/50">overlay</span>{" "}
            installed.
          </p>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The widget your clients paid for isn&apos;t a defence. It&apos;s becoming the reason
            they get named.
          </p>

          <div className="mt-12 overflow-hidden rounded-md border border-border bg-background font-mono text-sm">
            <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span className="select-none text-[var(--primary)]">┌─ </span>
              evidence · public record
            </div>
            <ul className="divide-y divide-border">
              <li className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="shrink-0 text-2xl text-foreground">
                  <StatCount value={1000000} prefix="$" />
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground font-sans">
                  FTC fine against an overlay vendor for claiming a script makes a site
                  compliant.<sup>1</sup>
                </p>
              </li>
              <li className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="shrink-0 text-2xl tabular-nums text-foreground">Jun 28, 2025</p>
                <p className="text-sm leading-relaxed text-muted-foreground font-sans">
                  The EU Accessibility Act is enforceable — not a future deadline, already in
                  force.<sup>2</sup>
                </p>
              </li>
              <li className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="shrink-0 text-2xl text-foreground">
                  <StatCount value={5500} suffix="+" />
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground font-sans">
                  Projected US federal ADA web-accessibility filings in 2026, most against
                  companies under $25M revenue.<sup>3</sup>
                </p>
              </li>
            </ul>
          </div>
        </section>
      </Reveal>

      {/* ── What it does: the loop, as a diff not an icon grid ─────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            What lands in the report
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] leading-tight text-balance">
            Three outputs. Only one of them touches compliance — and we never blur them.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:items-start">
          <Reveal className="space-y-8">
            <div className="border-l-2 border-primary pl-5">
              <h3 className="text-lg font-semibold">The verdict — axe-core</h3>
              <p className="mt-1.5 text-muted-foreground">
                Deterministic, citable WCAG violations at every state, including the ones
                behind your client&apos;s login. This is the evidence. Not AI-generated.
              </p>
            </div>
            <div className="border-l-2 border-border pl-5">
              <h3 className="text-lg font-semibold">
                Task success <span className="align-middle text-xs font-normal text-muted-foreground">— the persona layer · Pro</span>
              </h3>
              <p className="mt-1.5 text-muted-foreground">
                A real-shaped user browses toward a goal. Did a first-time visitor actually
                finish checkout? A crawler can&apos;t tell you that. Personaudit can.
              </p>
            </div>
            <div className="border-l-2 border-border pl-5">
              <h3 className="text-lg font-semibold">
                Opinion <span className="align-middle text-xs font-normal text-muted-foreground">— labeled AI, never a verdict</span>
              </h3>
              <p className="mt-1.5 text-muted-foreground">
                Where a real person got confused — jargon, buried pricing, a tap target too
                small. Useful signal, clearly marked as AI opinion. It never enters the
                compliance report and never carries a severity.
              </p>
            </div>
          </Reveal>

          {/* WCAG diff motif */}
          <Reveal delay={80}>
            <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-xs">
              <div className="border-b border-border px-4 py-2.5 text-muted-foreground">
                1.1.1 — Non-text Content · /product/hero
              </div>
              <div className="space-y-1 p-4">
                {/* Diff as border-accent + colored marker, not a fill tint — a faint
                    severity tint drops the colored code text below AA (DESIGN.md). */}
                <p
                  className="flex gap-2 rounded-sm border-l-2 px-2 py-1"
                  style={{ borderColor: "var(--severity-critical)" }}
                >
                  <span aria-hidden="true" style={{ color: "var(--severity-critical)" }}>-</span>
                  <code className="text-foreground">{"<img src=\"hero.jpg\">"}</code>
                </p>
                <p
                  className="flex gap-2 rounded-sm border-l-2 px-2 py-1"
                  style={{ borderColor: "var(--severity-minor)" }}
                >
                  <span aria-hidden="true" style={{ color: "var(--severity-minor)" }}>+</span>
                  <code className="text-foreground">{"<img src=\"hero.jpg\" alt=\"Clinician reviewing a chart with a patient\">"}</code>
                </p>
                <p className="px-2 pt-2 font-sans text-muted-foreground">
                  Every finding ships with the element, the rule, and the states it appeared
                  in — the fix is obvious, and the report proves you found it.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Multi-site strip: the agency identity ──────────────────────── */}
      <Reveal className="border-y border-border bg-card">
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              One place, every client
            </p>
            <h2 className="mt-4 font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] leading-tight text-balance">
              Stop re-running a single-site scanner twenty times.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every client site becomes a project — run audits, see new vs cleared defects
              vs the last run, open history, and export a compliance report per client.
              Scheduled re-scans are next; today you drive when each site gets checked.
            </p>
          </div>

          <ul className="mt-12 grid gap-3 sm:grid-cols-2">
            {SITES.map((s) => (
              <li
                key={s.domain}
                className="flex items-center justify-between rounded-md border border-border bg-background py-3.5 pr-4 pl-0"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-9 w-1 rounded-sm"
                    style={{ backgroundColor: s.ok ? "var(--severity-minor)" : "var(--severity-serious)" }}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm font-medium">{s.domain}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{s.note}</span>
                  </span>
                </span>
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{ color: s.ok ? "var(--severity-minor)" : "var(--severity-serious)" }}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start">
            <ConsolePreview />
            <ReportPaper />
          </div>
        </section>
      </Reveal>

      {/* ── CI gate — agency selling point ─────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            CI gate
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] leading-tight text-balance">
            Fail the client&apos;s build only on new defects.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Baseline today&apos;s backlog once, then gate CI on regressions — existing issues
            stay ignored until you clear them. Deterministic axe-core, no API key, works
            behind a saved session. Same identity the project regression panel uses.
          </p>
        </Reveal>
        <Reveal delay={60}>
          <pre className="mt-10 overflow-x-auto rounded-md border border-border bg-card p-5 font-mono text-xs leading-relaxed text-foreground">
{`# snapshot today's defects (commit the baseline)
mpersonas scan https://client.app --session ./session.json \\
  --baseline mpersonas-baseline.json --update-baseline

# CI: exit 2 only on NEW defects at/above serious
mpersonas scan https://client.app --session ./session.json \\
  --baseline mpersonas-baseline.json --fail-on serious`}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Full walkthrough and ready-to-use GitHub Action:{" "}
            <Link
              href="/guides/ci-accessibility-gate"
              className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              CI accessibility gate
            </Link>
            . Try a free public scan on the{" "}
            <Link
              href="/#scan"
              className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              homepage
            </Link>
            .
          </p>
        </Reveal>
      </section>

      {/* ── Honesty / not-an-overlay ───────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        <Reveal>
          <h2 className="font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] leading-tight text-balance">
            We don&apos;t sell a fix. We sell the truth.
          </h2>
          <div className="mt-6 space-y-4 font-serif text-lg leading-relaxed text-muted-foreground">
            <p>
              No overlay. No &ldquo;one line of JavaScript makes you compliant.&rdquo; We audit
              the real DOM with axe-core — on public pages in the hosted product, and behind
              login via the CLI where credentials never leave your machine — and tell you
              exactly what&apos;s broken and where. You hand your client a report they can act
              on — or defend.
            </p>
            <p>
              And we&apos;re honest about the limits: axe-core renders the compliance verdict;
              personas give you usability opinion and task success, clearly marked as AI. We
              don&apos;t simulate disabled users, and nothing automated replaces testing with
              them — for that, use{" "}
              <a
                href="https://makeitfable.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Fable
              </a>
              , who pay disabled testers.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── The plan: three steps, in the buyer's terms, not the tool's ─── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-28">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Your first week
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] leading-tight text-balance">
            Three steps to a report you can put in front of a client.
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          {FIRST_WEEK.map((step, i) => (
            <li key={step.title} className="bg-background">
              <Reveal delay={i * 80} className="h-full p-6">
                <p className="font-mono text-xs text-[var(--primary)]">
                  <span className="select-none tabular-nums">{`0${i + 1} · `}</span>
                  {step.when}
                </p>
                <p className="mt-3 font-heading text-lg leading-snug">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Early access / waitlist ────────────────────────────────────── */}
      <section id="early-access" className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Founding access
            </p>
            {/* Never advertise a price with no way to pay. Until the Payment Link is set
                on Vercel, this reads as early access and the waitlist form is the only ask. */}
            <h2 className="mt-4 font-heading text-[clamp(1.9rem,4vw,3rem)] leading-tight text-balance">
              {FOUNDING_CHECKOUT_URL
                ? "$199 a month. One price, no sales call."
                : "Help shape the agency workspace."}
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Every client site you ship, one workspace. Multi-site projects with new and
              cleared findings against the last run, scheduled re-scans, a CI gate your devs
              can&apos;t merge past, and a verdicts-only compliance report you white-label
              with your agency name and hand to the client.
            </p>

            {/* Honest pre-order boundary (ADR 0002). Hosted behind-login does NOT exist:
                /api/audit takes a URL, and no storageState handling exists in web/. Say so
                here, plainly, on the surface where someone decides to pay. */}
            <div className="mt-6 rounded-sm border border-border bg-background p-5">
              <p className="font-mono text-xs uppercase tracking-wide text-[var(--primary)]">
                What is and isn&apos;t built
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Behind-login scanning runs in the <span className="text-foreground">CLI</span>{" "}
                today. Your client&apos;s password never leaves your machine, which is the
                whole point, and it is the part enterprise crawlers get wrong. Running those
                scans <span className="text-foreground">hosted</span> is not built yet. It is
                what founding access funds.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You are paying before that ships. We would rather say that than sell you a
                screenshot of it. If we never build it, you get your money back.
              </p>
            </div>

            <p className="mt-6 text-muted-foreground">
              {FOUNDING_CHECKOUT_URL
                ? "Founding price is locked for as long as you stay. It goes up for everyone after."
                : "Founding access opens shortly. Leave your email and I'll send you the link first."}
            </p>
          </Reveal>
          <Reveal delay={80}>
            {FOUNDING_CHECKOUT_URL ? (
              <div className="rounded-sm border border-border bg-background p-6">
                <p className="font-heading text-2xl tracking-tight">Start founding access</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  $199 per month, cancel any time. Takes about a minute.
                </p>
                <FoundingCheckoutLink
                  href={FOUNDING_CHECKOUT_URL}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-sm bg-foreground px-6 py-3 text-sm font-semibold text-background transition-[background-color] hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  Get founding access — $199/mo
                </FoundingCheckoutLink>
                <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
                  Not ready to commit? Tell us what would change that. A no is as useful to us
                  as a yes, and more honest than silence.
                </p>
                <div className="mt-4">
                  <WaitlistForm />
                </div>
              </div>
            ) : (
              <WaitlistForm />
            )}
          </Reveal>
        </div>
      </section>
      </main>

      <SiteFooter
        footnotes={
          <ol className="space-y-1 text-xs text-muted-foreground">
            <li>1. FTC v. accessiBe, settlement announced January 2025 (ftc.gov).</li>
            <li>2. European Accessibility Act, enforcement from 28 June 2025.</li>
            <li>
              3. Projection based on Q1 2025 federal ADA Title III web filings (accessible.org /
              UsableNet trend data). Figures are directional.
            </li>
          </ol>
        }
      />
    </div>
  );
}
