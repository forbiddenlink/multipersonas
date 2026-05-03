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
    title: "Get actionable findings",
    description:
      "See what broke, what confused, and what failed accessibility standards — with fix suggestions",
  },
];

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

      {/* Bottom CTA */}
      <section className="flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight font-heading">
          Ready to improve your site?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Create a free account to run full audits, save results, and track improvements over time.
        </p>
        <Link
          href="/auth/signup"
          className="mt-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start auditing free
        </Link>
      </section>
    </div>
  );
}
