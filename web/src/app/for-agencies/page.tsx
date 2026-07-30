import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { Reveal } from "@/components/reveal";
import { AuditTerminal } from "@/components/audit-terminal";
import { Wordmark } from "@/components/forensic/wordmark";

export const metadata: Metadata = {
  title: "For agencies — one audit trail for every client site",
  description:
    "Personaudit walks every client site behind the login, runs axe-core at each state, and hands you the evidence report. Real audits, not an overlay widget. Early access for agencies.",
};

// Fictional client domains — illustrative, not real client sites.
const SITES = [
  { domain: "northwind-store.com", status: "clean", note: "0 new · scanned 2m ago", ok: true },
  { domain: "meridian-clinic.com", status: "3 findings", note: "checkout · behind login", ok: false },
  { domain: "harborview-realty.com", status: "clean", note: "0 new · scanned 1h ago", ok: true },
  { domain: "atlas-freight.io", status: "1 finding", note: "contrast · dashboard", ok: false },
];

export default function ForAgenciesPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader />

      {/* ── Hero: split ledger ─────────────────────────────────────────── */}
      <section
        id="main"
        className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-24 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
      >
        <div className="max-w-xl">
          <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px w-8 bg-primary" />
            For agencies &amp; freelancers
          </p>
          <h1 className="mt-6 font-heading text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-balance">
            Every client site is your liability now.
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            Personaudit walks each client&apos;s site the way a real user does — behind the
            login, through checkout — runs <span className="text-foreground">axe-core</span> at
            every state it reaches, and hands you the evidence report. Not a widget bolted to
            the page. An actual audit.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#early-access"
              className="inline-flex items-center justify-center rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-[background-color] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Get early access
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-sm px-4 py-3 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Try the free scan first
            </Link>
          </div>
        </div>

        {/* The product, visibly working — a persona auditing behind the login, live. */}
        <div className="lg:pl-2">
          <AuditTerminal />
        </div>
      </section>

      {/* ── The stakes: overlay villain + numbers ──────────────────────── */}
      <Reveal className="border-y border-border bg-card/40">
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <p className="max-w-3xl font-heading text-[clamp(1.6rem,3.4vw,2.5rem)] leading-[1.15] text-balance">
            <span className="tabular-nums text-primary">456</span> of 2025&apos;s accessibility
            lawsuits hit sites that already had an accessibility{" "}
            <span className="text-muted-foreground line-through decoration-destructive/50">overlay</span>{" "}
            installed.
          </p>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The widget your clients paid for isn&apos;t a defence. It&apos;s becoming the reason
            they get named.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-background p-5">
              <p className="font-mono text-3xl tabular-nums">$1,000,000</p>
              <p className="mt-2 text-sm text-muted-foreground">
                FTC fine against an overlay vendor for claiming a script makes a site
                compliant.<sup>1</sup>
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-5">
              <p className="font-mono text-3xl tabular-nums">Jun 28, 2025</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The EU Accessibility Act is enforceable — not a future deadline, already in
                force.<sup>2</sup>
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-5">
              <p className="font-mono text-3xl tabular-nums">5,500+</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Projected US federal ADA web-accessibility filings in 2026, most against
                companies under $25M revenue.<sup>3</sup>
              </p>
            </div>
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
              <h3 className="text-lg font-semibold">Task success — the persona layer</h3>
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
                <p
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: "color-mix(in oklch, var(--severity-critical) 10%, transparent)", color: "var(--severity-critical)" }}
                >
                  {"- <img src=\"hero.jpg\">"}
                </p>
                <p
                  className="rounded px-2 py-1"
                  style={{ backgroundColor: "color-mix(in oklch, var(--severity-minor) 12%, transparent)", color: "var(--severity-minor)" }}
                >
                  {"+ <img src=\"hero.jpg\" alt=\"Clinician reviewing a chart with a patient\">"}
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
      <Reveal className="border-y border-border bg-card/40">
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
                    className="h-9 w-1 rounded-full"
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
            Ready-to-use GitHub Action:{" "}
            <a
              href="https://github.com/forbiddenlink/multipersonas/tree/main/examples/github-actions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              examples/github-actions
            </a>
            . Try a free public scan on the{" "}
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
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
          <div className="mt-6 space-y-4 text-lg text-muted-foreground">
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

      {/* ── Early access / waitlist ────────────────────────────────────── */}
      <section id="early-access" className="border-t border-border bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Early access
            </p>
            <h2 className="mt-4 font-heading text-[clamp(1.9rem,4vw,3rem)] leading-tight text-balance">
              Help shape the agency workspace.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              The engine is live — free public scans on the web, behind-login scanning via
              the CLI (credentials stay on your machine), multi-site projects with
              new/cleared regression vs the last run, and a verdicts-only compliance
              report you can print to PDF.
            </p>
            <p className="mt-4 text-muted-foreground">
              Join early if you ship many client sites under ADA / EAA pressure. Tell us how
              you&apos;d use it — scheduled re-scans and white-label reports are next on the
              list for agencies who raise their hand.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <WaitlistForm />
          </Reveal>
        </div>
      </section>

      {/* ── Footnotes + footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <ol className="space-y-1 text-xs text-muted-foreground">
            <li>1. FTC v. accessiBe, settlement announced January 2025 (ftc.gov).</li>
            <li>2. European Accessibility Act, enforcement from 28 June 2025.</li>
            <li>3. Projection based on Q1 2025 federal ADA Title III web filings (accessible.org / UsableNet trend data). Figures are directional.</li>
          </ol>
          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <Wordmark className="text-sm text-foreground" />
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
              <Link href="/guides/wcag-checklist" className="transition-colors hover:text-foreground">WCAG Checklist</Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
