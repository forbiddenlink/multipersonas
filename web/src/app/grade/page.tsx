import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";

export const metadata: Metadata = {
  alternates: { canonical: "/grade" },
  title: "Free accessibility grade",
  description:
    "Get a free, honest letter grade on any public page: graded on WCAG A/AA axe-core findings, no signup, no paywall on the score.",
};

const WHAT_YOU_GET = [
  {
    n: "1",
    title: "A letter grade you can trace",
    body: "A to F, from how many automated checks pass and how serious the failures are. The checks come from axe-core, a widely used open-source accessibility engine, and test against WCAG 2.2 A and AA. Best-practice issues are listed but never lower the letter.",
  },
  {
    n: "2",
    title: "Every page we reached",
    body: "Up to 10 public pages on the same site, each with its own score, so one bad page doesn't hide behind a good average.",
  },
  {
    n: "3",
    title: "Failing rules, cited",
    body: "Each failing rule, how many places it fails, and the WCAG 2.2 success criterion it breaks, with a plain-language fix.",
  },
] as const;

export default function GradePage() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />

      <main id="main" className="exhibits flex-1">
        <section className="border-b border-border">
          <div className="frame-narrow py-12 sm:py-16">
            <ExhibitHead label="Free · public pages · no signup" />
            <h1 className="display mt-8 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05]">
              Grade any public site <span className="mark-sweep">in one pass.</span>
            </h1>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-muted-foreground">
              Enter a web address. We check up to 10 public pages on the site and hand back a letter
              grade, what to fix first, and the evidence behind each finding. The grade comes from
              automated checks only, with no AI opinion in it.
            </p>

            <div className="sheet mt-8 p-6 sm:p-8">
              <GradeForm />
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Not ready to hand over a real URL yet?{" "}
              <Link href="/sample-report" className="text-link">
                See a finished sample report
              </Link>{" "}
              from a public test store first.
            </p>
          </div>
        </section>

        <section aria-labelledby="what-you-get-heading" className="section-y bg-card border-b border-border">
          <div className="frame">
            <ExhibitHead label="What comes back" />
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <h2 id="what-you-get-heading" className="display max-w-md text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08] lg:sticky lg:top-24 lg:self-start">
              A finding you can hand to a client, not a percentage you have to defend.
            </h2>
            <ol className="border-t border-border">
              {WHAT_YOU_GET.map((item) => (
                <li
                  key={item.n}
                  className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-8"
                >
                  <span className="display text-3xl leading-none text-muted-foreground">{item.n}</span>
                  <div className="min-w-0">
                    <h3 className="text-[1.0625rem] font-semibold">{item.title}</h3>
                    <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="scope-heading" className="section-y-sm">
          <div className="frame">
            <ExhibitHead label="Limits" />
            <div className="sheet margin-rule mt-8 max-w-3xl p-6 pl-12 sm:p-8 sm:pl-14">
            <h2 id="scope-heading" className="display text-[clamp(1.5rem,2.6vw,1.9rem)] leading-tight">
              What this scan doesn&apos;t see
            </h2>
            <p className="mt-3 max-w-[36rem] leading-relaxed text-muted-foreground">
              Public pages only. It never sees behind a login, a PDF, or a real checkout flow:
              the states where most accessibility risk sits. For that, run the{" "}
              <Link href="/docs" className="text-link">
                free CLI
              </Link>{" "}
              from your own machine, or read{" "}
              <Link href="/for-agencies" className="text-link">
                what an agency plan adds
              </Link>
              .
            </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
