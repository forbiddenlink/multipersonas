import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditForm } from "@/components/audit-form";
import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Enter your URL",
    description: "Paste any website URL — public or staging",
  },
  {
    number: "2",
    title: "AI personas browse your site",
    description:
      "A screen reader user, first-time visitor, and mobile user each navigate your site independently",
  },
  {
    number: "3",
    title: "Get findings you can fix",
    description:
      "See what broke, what confused, and what failed WCAG — with fix suggestions",
  },
];

const sampleFindings = [
  {
    persona: "Sarah",
    role: "First-Time Visitor",
    score: 72,
    finding: "Navigation menu has no visible focus indicators — keyboard users can't tell where they are",
    severity: "serious" as const,
  },
  {
    persona: "James",
    role: "Screen Reader User",
    score: 45,
    finding: "Form inputs missing associated labels — screen reader announces 'edit text' with no context",
    severity: "critical" as const,
  },
  {
    persona: "Maria",
    role: "Mobile / Slow Connection",
    score: 81,
    finding: "Hero image is 2.4 MB with no lazy loading — takes 8 seconds on 3G",
    severity: "moderate" as const,
  },
];

function severityDot(severity: "critical" | "serious" | "moderate") {
  const colors = {
    critical: "bg-[oklch(0.65_0.20_25)]",
    serious: "bg-[oklch(0.72_0.16_55)]",
    moderate: "bg-[oklch(0.78_0.12_85)]",
  };
  return colors[severity];
}

function severityLabel(severity: "critical" | "serious" | "moderate") {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 sm:py-32 text-center">
        <Badge variant="secondary" className="mb-6">
          AI-Powered Accessibility Testing
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-heading">
          Test your website through the eyes of real users
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          AI personas with diverse backgrounds, accessibility needs, and tech
          proficiency levels browse your site and report what breaks.
        </p>
      </section>

      {/* Metrics */}
      <div className="flex items-center justify-center gap-8 px-6 pb-8 sm:gap-12">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">3</p>
          <p className="text-xs text-muted-foreground">AI personas</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">WCAG 2.1</p>
          <p className="text-xs text-muted-foreground">AA compliance</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">Real</p>
          <p className="text-xs text-muted-foreground">browser testing</p>
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
          <div className="absolute top-5 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] hidden h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 sm:block" />
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

      {/* Sample Report */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20" id="example">
        <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight font-heading">
          What you get
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-center text-sm text-muted-foreground">
          Each persona browses your site independently and reports issues from their perspective.
          Here&apos;s a sample from a real audit.
        </p>

        {/* Score ring */}
        <div className="mb-10 flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center size-24">
            <svg className="-rotate-90" viewBox="0 0 120 120" width="96" height="96">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                strokeWidth="6" strokeLinecap="round"
                stroke="oklch(0.78 0.12 85)"
                strokeDasharray={`${(66 / 100) * 327} 327`}
              />
            </svg>
            <span className="absolute text-2xl font-bold tabular-nums text-yellow-400">66</span>
          </div>
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className="text-xs font-medium text-yellow-400">Needs Work</p>
        </div>

        {/* Persona findings */}
        <div className="grid gap-4 sm:grid-cols-3">
          {sampleFindings.map((item) => (
            <div
              key={item.persona}
              className="rounded-xl border border-border p-5 space-y-3 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.persona}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
                <span className={`text-lg font-bold tabular-nums ${
                  item.score >= 80 ? "text-green-400" : item.score >= 50 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {item.score}
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${severityDot(item.severity)}`} />
                  <span className="text-xs font-medium">{severityLabel(item.severity)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.finding}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sample data from a real audit — your results will vary.
        </p>
      </section>

      <Separator />

      {/* Bottom CTA */}
      <section className="flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight font-heading">
          Ready to improve your site?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Sign up to save your audit results and track fixes over time.
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
                className="transition-colors hover:text-foreground"
              >
                Elizabeth Stein
              </a>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/personas" className="py-2 transition-colors hover:text-foreground">Personas</Link>
            <a href="mailto:hello@multipersonas.dev" className="py-2 transition-colors hover:text-foreground">Contact</a>
            <Link href="/privacy" className="py-2 transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="py-2 transition-colors hover:text-foreground">Terms</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-muted-foreground/60">
          Audit findings are generated by AI and should be verified manually.
        </p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:hidden">
        <Link
          href="/auth/signup"
          className="block w-full rounded-md bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start your free audit
        </Link>
      </div>
    </div>
  );
}
