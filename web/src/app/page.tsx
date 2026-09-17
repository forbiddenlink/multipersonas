import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";
import { AuditTerminal } from "@/components/audit-terminal";
import { ReportExcerpt } from "@/components/forensic/report-excerpt";
import { ReportPaper } from "@/components/forensic/report-paper";
import { ConsolePreview } from "@/components/forensic/console-preview";
import { ReplayStrip } from "@/components/forensic/replay-strip";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";
import { FocusDemo } from "@/components/forensic/focus-demo";
import { ContrastBadge } from "@/components/forensic/contrast-badge";
import { BoxDivider } from "@/components/forensic/divider";
import { LogReveal } from "@/components/log-reveal";
import Link from "next/link";

// Canonical only — title/description are inherited from the root layout default.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// How-it-works as a run-log — real tool steps, not numbered marketing circles.
const RUN_LOG: { src: string; text: string }[] = [
  { src: "input", text: "point it at a URL — public here, or behind a login via a saved CLI session" },
  { src: "crawl", text: "walk every reachable state: authed pages, checkout, multi-step flows" },
  { src: "axe-core", text: "render the deterministic verdict at each state — citable to WCAG" },
  { src: "persona", text: "check whether a real-shaped user actually completes the flow" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />

      <main id="main">
      {/* Hero — the signature: tight headline + live audit-terminal. Grain on the dark
          fill; real content sits above it on z-10. */}
      <section className="grain relative overflow-hidden border-b border-border">
        <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:py-24">
          <div>
            <p className="fade-up font-mono text-xs uppercase tracking-wide text-muted-foreground" style={{ animationDelay: "0.05s" }}>
              axe-core · session crawl · CI gate
            </p>
            {/* No entrance animation on the headline: it's the LCP element, so it must
                paint immediately rather than fade in from opacity:0. */}
            <h1 className="mt-6 text-[clamp(2.4rem,5.5vw,3.75rem)] font-bold leading-[1.03] tracking-tight text-balance">
              Scan behind the login. The password stays on your machine.
            </h1>
            <p className="fade-up mt-5 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: "0.19s" }}>
              Every SaaS scanner that audits your checkout wants your client&apos;s login first.
              Personaudit crawls with a saved session from your own machine, through checkout,
              dashboards, and multi-step flows a page-level scanner never reaches, and runs{" "}
              <strong className="font-medium text-foreground not-italic">axe-core</strong> at every
              state it lands on. Nothing to hand over.
            </p>
            <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "0.26s" }}>
              <Link
                href="#scan"
                className="rounded-sm bg-foreground px-5 py-2.5 text-center text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Run a free grade
              </Link>
              <Link
                href="/for-agencies"
                className="rounded-sm border border-border px-5 py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                For agencies
              </Link>
            </div>
            <p className="fade-up mt-4 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground" style={{ animationDelay: "0.32s" }}>
              The free grade covers public pages, no signup. Behind-login scanning stays on your machine.
            </p>
          </div>

          <div className="fade-up lg:pl-2" style={{ animationDelay: "0.34s" }}>
            <AuditTerminal />
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-[var(--primary)] motion-safe:animate-pulse" aria-hidden="true" />
              illustrative CLI transcript. See the same evidence structure in every completed report.
            </p>
          </div>
        </div>
      </section>

      {/* Dogfood band — the product demonstrates the exact things it audits. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10" aria-labelledby="dogfood-heading">
        <h2 id="dogfood-heading" className="sr-only">
          This site, audited by itself
        </h2>
        <BoxDivider label="this site, audited by itself" className="mb-6" />
        <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr] sm:items-center">
          <FocusDemo />
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="font-mono text-xs text-muted-foreground">body text contrast:</span>
            <ContrastBadge ratio="17.5:1" level="AAA" />
          </div>
        </div>
      </section>

      {/* The free entry — a public grade anyone can run (axe-core, no signup). Pro unlocks
          the HOSTED persona audit, which is public-URL only (/api/audit takes
          { url, personaIds, projectId } and no credentials). Behind-login belongs to the
          CLI, which runs the full crawl free. Do not conflate the two in copy. */}
      <section id="scan" className="border-y border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 font-mono text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>free grade — up to 10 public pages, no signup
          </p>
          <GradeForm />
          <p className="mt-5 font-mono text-xs leading-relaxed text-muted-foreground">
            Persona task-success on public flows is the{" "}
            <span className="text-foreground">Pro</span> layer. Behind-login crawls run
            free from the{" "}
            <Link
              href="/guides/ci-accessibility-gate"
              className="text-foreground underline underline-offset-4 hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              keyless CLI
            </Link>
            , where the password never leaves your machine.{" "}
            <Link
              href="/for-agencies"
              className="text-foreground underline underline-offset-4 hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Get early access
            </Link>
            .
          </p>
        </div>
      </section>

      {/* How it works — a run-log. */}
      <section className="mx-auto w-full max-w-3xl px-6 section-y">
        <p className="label-mono">pipeline</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
          <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">┌─ </span>personaudit ~/run
          </div>
          <LogReveal>
            <ol className="divide-y divide-border">
              {RUN_LOG.map((l) => (
                <li key={l.src} className="log-line flex gap-3 px-4 py-3 leading-relaxed">
                  <span className="select-none text-[var(--primary)]">›</span>
                  <span>
                    <span className="text-muted-foreground">[{l.src}]</span>{" "}
                    <span className="text-card-foreground">{l.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </LogReveal>
        </div>
      </section>

      {/* Two outputs, never blurred — the honesty wall. */}
      <section className="border-y border-border bg-card px-6 section-y">
        <div className="mx-auto w-full max-w-3xl">
        <p className="font-serif text-[clamp(1.3rem,2.6vw,1.8rem)] leading-[1.3] font-medium text-balance text-foreground">
          &ldquo;Violation&rdquo; and &ldquo;opinion&rdquo; are different words for a reason.
        </p>
        <p className="mt-2 label-mono">honesty wall</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <SeverityChip severity="critical" />
              <span className="font-medium">Accessibility violations</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              From <strong className="font-medium text-foreground">axe-core</strong> — deterministic,
              citable, per state. The only output that touches compliance.
            </p>
          </div>
          <div>
            <p className="font-medium">
              Usability &amp; task success
              <span className="ml-2 rounded-sm border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                Pro
              </span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              From UX personas — did a real-shaped user complete the flow? Opinion and outcome,
              clearly labeled. Never a compliance verdict.
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          We don&apos;t simulate disabled users, and nothing here replaces testing with them — for
          that, use{" "}
          <a
            href="https://makeitfable.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Fable
          </a>
          .
        </p>
        </div>
      </section>

      {/* Persona wedge — the product's memorable reason to exist. */}
      <section className="mx-auto w-full max-w-6xl px-6 section-y" aria-labelledby="persona-wedge-heading">
        <p className="label-mono">persona layer</p>
        <h2 id="persona-wedge-heading" className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight">
          The report says what broke. The persona shows why it mattered.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Agencies do not just need another violation list. They need the client story: the
          first-time buyer who never found pricing, the keyboard-only path that got trapped,
          the mobile visitor who abandoned checkout, and the fix owner who can clear it.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Sarah</p>
            <h3 className="mt-2 text-sm font-medium">First-time buyer</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Finds the promise, pricing, proof, and next step before trust runs out.
            </p>
          </div>
          <div className="rounded-md border border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Keyboard traversal</p>
            <h3 className="mt-2 text-sm font-medium">Reachability harness</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Drives focus through real states so axe can judge screens a URL scan misses.
            </p>
          </div>
          <div className="rounded-md border border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Maria</p>
            <h3 className="mt-2 text-sm font-medium">Slow mobile visitor</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Surfaces the messy mobile moments that decide whether a flow survives contact.
            </p>
          </div>
        </div>
      </section>

      {/* What you get — instrument gallery: report paper, replay, console. */}
      <section id="example" className="mx-auto w-full max-w-6xl px-6 section-y">
        <p className="label-mono">output</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">The instrument, not a mockup.</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Deterministic axe-core violations on paper, a scrubbable persona walk with verdicts at
          each state, and the signed-in console language — the same primitives the product uses.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start">
          <ReportPaper />
          <ReplayStrip />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <ConsolePreview />
          <div className="space-y-4">
            <ReportExcerpt />
            <div className="rounded-md border border-border bg-card p-5">
              <p className="label-mono">persona task-success</p>
              <Meter
                className="mt-4"
                value={2}
                total={3}
                label="reached their goal"
                unit="personas"
                tone="serious"
              />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                One persona was blocked at checkout by the critical violation — a task a page-level
                crawler can&apos;t measure.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SeverityChip severity="critical" ruleId="4.1.2" />
                <SeverityChip severity="serious" ruleId="1.4.3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CI gate — already built in the CLI; surface it as a selling point. */}
      <section className="border-y border-border bg-card px-6 section-y-sm">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-sm">
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>
            <span className="text-muted-foreground"># ci-gate</span>
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Fail the build only on new defects.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Baseline today&apos;s backlog once, then gate CI on regressions — existing issues
            stay ignored until you clear them. Deterministic, no API key, works behind a
            saved session.
          </p>
          <pre tabIndex={0} role="region" aria-label="Command-line scanning example" className="mt-6 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
{`# snapshot today's defects (commit the baseline)
mpersonas scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --update-baseline

# CI: exit 2 only on NEW defects at/above serious
mpersonas scan https://app.example.com --session ./session.json \\
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
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA — account save only; primary scan CTA lives at #scan / sticky. */}
      <section className="border-t border-border px-6 section-y">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Build the audit trail.</h2>
          <p className="max-w-md font-serif text-muted-foreground leading-relaxed">
            Sign up after a free grade and that scan lands on your dashboard — axe violations
            by page, a shareable score, ready to show a client. Persona task-success is the
            Pro layer. Behind-login crawls stay in the keyless CLI.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="rounded-sm border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Create an account
            </Link>
            <Link
              href="/for-agencies"
              className="rounded-sm px-5 py-2.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Agency founding access
            </Link>
          </div>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}
