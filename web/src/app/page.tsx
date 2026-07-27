import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditForm } from "@/components/audit-form";
import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Point it at a URL",
    description:
      "Public, or behind a login using a saved browser session — your credentials never leave your machine",
  },
  {
    number: "2",
    title: "It crawls every reachable state",
    description:
      "Authenticated pages, checkout, and multi-step flows a single-URL scanner never sees",
  },
  {
    number: "3",
    title: "axe-core renders the verdict",
    description:
      "Deterministic, citable violations at each state — plus a persona task-success check. Gate CI on new defects.",
  },
];

// axe-core violations — the deterministic core. These mirror the real report shape
// (rule, severity, where it was found), not an invented per-persona score.
const sampleViolations = [
  {
    title: "Form inputs have no associated label",
    severity: "critical" as const,
    where: "Checkout step 2 — reached only behind the login",
  },
  {
    title: "Interactive control not reachable by keyboard",
    severity: "serious" as const,
    where: "Account settings — dropdown menu",
  },
  {
    title: "Insufficient text contrast (3.9:1)",
    severity: "moderate" as const,
    where: "Dashboard — muted helper text",
  },
];

function severityDotStyle(severity: "critical" | "serious" | "moderate") {
  const token = {
    critical: "var(--severity-critical)",
    serious: "var(--severity-serious)",
    moderate: "var(--severity-moderate)",
  }[severity];
  return { backgroundColor: token };
}

function severityLabel(severity: "critical" | "serious" | "moderate") {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />

      {/* Hero */}
      <section id="main" className="flex flex-col items-center justify-center px-6 py-24 sm:py-32 text-center">
        <Badge variant="secondary" className="mb-6">
          Accessibility testing · behind your login
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-heading">
          Scan the pages a crawler can&apos;t reach
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          MultiPersonas crawls your site with a saved session — through checkout, dashboards, and
          multi-step flows a page-level scanner never reaches — and runs <strong className="text-foreground">axe-core</strong> at
          every state. Deterministic findings. Your credentials never leave your machine.
        </p>
      </section>

      {/* Metrics */}
      <div className="flex items-center justify-center gap-8 px-6 pb-8 sm:gap-12">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">axe-core</p>
          <p className="text-xs text-muted-foreground">the verdict engine</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">Behind login</p>
          <p className="text-xs text-muted-foreground">states a crawler skips</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">CI-ready</p>
          <p className="text-xs text-muted-foreground">gate builds on new defects</p>
        </div>
      </div>

      {/* Free Audit */}
      <section className="px-6 pb-16">
        <AuditForm />
      </section>

      <Separator />

      {/* How it works - actual steps */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight font-heading">
          How it works
        </h2>
        <div className="relative grid gap-8 sm:grid-cols-3">
          {/* Connecting line between steps (desktop only) */}
          <div className="absolute top-5 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] hidden h-px bg-linear-to-r from-primary/20 via-primary/40 to-primary/20 sm:block" />
          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/30 transition-transform hover:scale-110">
                {step.number}
              </div>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* What honesty looks like */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight font-heading">
          Two outputs, never blurred
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-5">
            <p className="font-medium">Accessibility violations</p>
            <p className="mt-2 text-sm text-muted-foreground">
              From <strong className="text-foreground">axe-core</strong> — deterministic, citable,
              per state. This is the only output that touches compliance.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5">
            <p className="font-medium">Usability &amp; task success</p>
            <p className="mt-2 text-sm text-muted-foreground">
              From UX personas — did a real-shaped user complete the flow? Opinion and outcome,
              clearly labeled. Never a compliance verdict.
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          We don&apos;t simulate disabled users, and nothing here replaces testing with them —
          for that, use{" "}
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
      </section>

      <Separator />

      {/* Sample Report — mirrors the real output shape */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20" id="example">
        <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight font-heading">
          What you get
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-center text-sm text-muted-foreground">
          Deterministic axe-core violations grouped by rule and the states they appeared in,
          plus how many personas reached their goal. Sample shown; real reports vary.
        </p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
          {/* Task success — the real metric: a fraction, not a 0-100 score */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-6">
            <div className="relative flex items-center justify-center size-24">
              <svg className="-rotate-90" viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  strokeWidth="6" strokeLinecap="round"
                  stroke="var(--severity-serious)"
                  strokeDasharray={`${(2 / 3) * 327} 327`}
                />
              </svg>
              <span className="absolute text-2xl font-bold tabular-nums">
                2<span className="text-muted-foreground">/3</span>
              </span>
            </div>
            <p className="text-sm font-medium">Personas reached their goal</p>
            <p className="text-center text-xs text-muted-foreground">
              One was blocked at checkout — a task a crawler can&apos;t measure at all.
            </p>
          </div>

          {/* axe violations — the deterministic core */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Accessibility violations (axe-core)
            </p>
            {sampleViolations.map((v) => (
              <div
                key={v.title}
                className="rounded-xl border border-border p-4 space-y-2 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={severityDotStyle(v.severity)} />
                  <span className="text-xs font-medium">{severityLabel(v.severity)}</span>
                  <span className="text-sm font-medium">{v.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">Found at: {v.where}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Bottom CTA */}
      <section className="flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight font-heading">
          Ready to see what&apos;s behind your login?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Sign up to save your reports and track which defects you&apos;ve cleared over time.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start your free audit
          </Link>
          <a
            href="#example"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
          >
            See example results
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              MultiPersonas
            </p>
            <p className="text-xs text-muted-foreground/60">
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
            <Link href="/guides/wcag-checklist" className="py-2 transition-colors hover:text-foreground">WCAG Checklist</Link>
            <Link href="/guides/common-accessibility-issues" className="py-2 transition-colors hover:text-foreground">Common Issues</Link>
            <a href="mailto:hello@multipersonas.dev" className="py-2 transition-colors hover:text-foreground">Contact</a>
            <Link href="/privacy" className="py-2 transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="py-2 transition-colors hover:text-foreground">Terms</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-muted-foreground/60">
          Persona usability notes are generated by AI and should be verified manually. Accessibility
          violations come from axe-core and are deterministic.
        </p>
      </footer>

      {/* Spacer for sticky CTA on mobile so footer isn't obscured */}
      <div className="h-16 sm:hidden" aria-hidden="true" />

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:hidden" aria-hidden="true">
        <Link
          href="/auth/signup"
          tabIndex={-1}
          className="block w-full rounded-md bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start your free audit
        </Link>
      </div>
    </div>
  );
}
