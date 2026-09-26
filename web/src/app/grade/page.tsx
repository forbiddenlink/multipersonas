import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";

export const metadata: Metadata = {
  alternates: { canonical: "/grade" },
  title: "Free accessibility grade",
  description:
    "Get a free, honest letter grade on any public page: real axe-core violation weights, no signup, no paywall on the score.",
};

const WHAT_YOU_GET = [
  {
    n: "1",
    title: "A letter grade you can trace",
    body: "A/B/C/D/F from the ratio of passed axe-core checks to violation weight. Not a fabricated composite.",
  },
  {
    n: "2",
    title: "Every page we reached",
    body: "Up to 10 public pages on the same site, each with its own score, so one bad page doesn't hide behind a good average.",
  },
  {
    n: "3",
    title: "Failing rules, cited",
    body: "Each rule's name, node count, and the WCAG 2.2 success criterion it breaks, with a plain-language fix.",
  },
] as const;

export default function GradePage() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />

      <main id="main" className="flex-1">
        <section className="border-b border-border">
          <div className="frame-narrow py-14 sm:py-20">
            <p className="label-mono">Free · public pages · no signup</p>
            <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05]">
              Grade any public site in one pass.
            </h1>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-muted-foreground">
              Enter a URL. We crawl what a stranger can reach without logging in, run{" "}
              <span className="font-medium text-foreground">axe-core</span> on every page, and
              hand back a letter grade with the evidence behind it, never a fabricated score,
              never a persona costume.
            </p>

            <div className="sheet mt-10 p-6 sm:p-8">
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
            <p className="label-mono">What comes back</p>
            <h2 id="what-you-get-heading" className="display mt-3 max-w-2xl text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.08]">
              A finding you can hand to a client, not a percentage you have to defend.
            </h2>
            <ol className="mt-12 border-t-2 border-foreground">
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
        </section>

        <section aria-labelledby="scope-heading" className="section-y-sm">
          <div className="frame-narrow">
            <h2 id="scope-heading" className="label-mono">
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
