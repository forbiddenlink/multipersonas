import { SiteHeader } from "@/components/site-header";
import { AuditForm } from "@/components/audit-form";
import { AuditTerminal } from "@/components/audit-terminal";
import { ReportExcerpt } from "@/components/forensic/report-excerpt";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";
import { FocusDemo } from "@/components/forensic/focus-demo";
import { ContrastBadge } from "@/components/forensic/contrast-badge";
import { BoxDivider } from "@/components/forensic/divider";
import { Wordmark } from "@/components/forensic/wordmark";
import Link from "next/link";

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
            <p className="flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
              <span className="rounded-sm border border-border px-2.5 py-1">axe-core · deterministic</span>
              <span className="rounded-sm border border-border px-2.5 py-1">crawls behind login</span>
              <span className="rounded-sm border border-border px-2.5 py-1">gate CI on new defects</span>
            </p>
            <h1 className="mt-6 text-[clamp(2.4rem,5.5vw,3.75rem)] font-bold leading-[1.03] tracking-tight text-balance">
              Scan the pages a crawler can&apos;t reach.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Personaudit crawls your site with a saved session — through checkout, dashboards, and
              multi-step flows a page-level scanner never reaches — and runs{" "}
              <strong className="font-medium text-foreground">axe-core</strong> at every state.
              Behind-login scanning runs from the CLI, so your credentials never leave your machine.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="#scan"
                className="rounded-sm bg-primary px-5 py-2.5 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Run a free scan
              </Link>
              <a
                href="#example"
                className="rounded-sm border border-border px-5 py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                See a sample report
              </a>
            </div>
          </div>

          <div className="lg:pl-2">
            <AuditTerminal />
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-[var(--primary)] motion-safe:animate-pulse" aria-hidden="true" />
              a persona is walking a checkout behind login — this is the actual instrument, not a mockup
            </p>
          </div>
        </div>
      </section>

      {/* Dogfood band — the product demonstrates the exact things it audits. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <BoxDivider label="this site, audited by itself" className="mb-6" />
        <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr] sm:items-center">
          <FocusDemo />
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="text-sm text-foreground">Body text here:</span>
            <ContrastBadge ratio="17.5:1" level="AAA" />
          </div>
        </div>
      </section>

      {/* The product — run a real scan. */}
      <section id="scan" className="border-y border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 font-mono text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>new scan — point it at any public URL
          </p>
          <AuditForm />
        </div>
      </section>

      {/* How it works — a run-log. */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">pipeline</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
          <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">┌─ </span>personaudit ~/run
          </div>
          <ol className="divide-y divide-border">
            {RUN_LOG.map((l) => (
              <li key={l.src} className="flex gap-3 px-4 py-3 leading-relaxed">
                <span className="select-none text-[var(--primary)]">›</span>
                <span>
                  <span className="text-muted-foreground">[{l.src}]</span>{" "}
                  <span className="text-card-foreground">{l.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two outputs, never blurred — the honesty wall. */}
      <section className="border-y border-border bg-card px-6 py-20">
        <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">honesty wall</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Two outputs, never blurred</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <SeverityChip severity="critical" />
              <span className="font-medium">Accessibility violations</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              From <strong className="font-medium text-foreground">axe-core</strong> — deterministic,
              citable, per state. The only output that touches compliance.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-5">
            <p className="font-medium">Usability &amp; task success</p>
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

      {/* What you get — the real report excerpt + the task-success layer. */}
      <section id="example" className="mx-auto w-full max-w-6xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">output</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">What you get</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Deterministic axe-core violations, cited to WCAG and grouped by the states they appeared
          in — plus how many personas reached their goal. Sample shown; real reports vary.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <ReportExcerpt />
          <div className="rounded-md border border-border bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              persona task-success
            </p>
            <Meter
              className="mt-4"
              value={2}
              total={3}
              label="reached their goal"
              unit="personas"
              tone="serious"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              One persona was blocked at checkout by the critical violation above — a task a page-level
              crawler can&apos;t measure at all.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SeverityChip severity="critical" ruleId="4.1.2" />
              <SeverityChip severity="serious" ruleId="1.4.3" />
            </div>
          </div>
        </div>
      </section>

      {/* CI gate — already built in the CLI; surface it as a selling point. */}
      <section className="border-y border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            CI gate
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Fail the build only on new defects.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Baseline today&apos;s backlog once, then gate CI on regressions — existing issues
            stay ignored until you clear them. Deterministic, no API key, works behind a
            saved session.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
{`# snapshot today's defects (commit the baseline)
mpersonas scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --update-baseline

# CI: exit 2 only on NEW defects at/above serious
mpersonas scan https://app.example.com --session ./session.json \\
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
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Keep every audit you run.</h2>
          <p className="max-w-md text-muted-foreground">
            Create an account and every scan you run from here on is saved to your dashboard, so you
            can track which defects you&apos;ve cleared over time.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Start your free audit
            </Link>
            <a
              href="#example"
              className="rounded-sm border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              See example results
            </a>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <Wordmark className="text-sm text-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">
              Built by{" "}
              <a
                href="https://github.com/forbiddenlink"
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 transition-colors hover:text-foreground"
              >
                Elizabeth Stein
              </a>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/for-agencies" className="py-2 transition-colors hover:text-foreground">For agencies</Link>
            <Link href="/guides/wcag-checklist" className="py-2 transition-colors hover:text-foreground">WCAG Checklist</Link>
            <Link href="/guides/common-accessibility-issues" className="py-2 transition-colors hover:text-foreground">Common Issues</Link>
            <Link href="/guides/screen-reader-testing" className="py-2 transition-colors hover:text-foreground">Screen Reader Testing</Link>
            <a href="mailto:hello@personaudit.com" className="py-2 transition-colors hover:text-foreground">Contact</a>
            <Link href="/privacy" className="py-2 transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="py-2 transition-colors hover:text-foreground">Terms</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-6xl text-center text-xs text-muted-foreground">
          Persona usability notes are generated by AI and should be verified manually. Accessibility
          violations come from axe-core and are deterministic.
        </p>
      </footer>

      {/* Spacer for sticky CTA on mobile so footer isn't obscured */}
      <div className="h-16 sm:hidden" aria-hidden="true" />

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:hidden">
        <Link
          href="#scan"
          className="block w-full rounded-sm bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Run a free scan
        </Link>
      </div>
    </div>
  );
}
