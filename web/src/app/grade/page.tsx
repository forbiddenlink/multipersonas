import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GradeForm } from "@/components/grade-form";
import { BoxDivider } from "@/components/forensic/divider";

export const metadata: Metadata = {
  title: "Free accessibility grade",
  description:
    "Get a free, honest letter grade on any public page — real axe-core violation weights, no signup, no paywall on the score.",
};

export default function GradePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader intent="grade" />

      <main id="main" className="flex-1">
        <section id="grade" className="mx-auto w-full max-w-2xl px-6 section-y">
          <p className="label-mono">
            free · public · no signup · axe-core only
          </p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] tracking-tight text-balance">
            Grade a public URL from real axe-core weight.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Enter any public URL. We crawl what we can reach and letter-grade it from the ratio of
            passed checks to violations — never a fabricated score, never a persona costume.
          </p>

          <div className="mt-10">
            <GradeForm />
          </div>

          <BoxDivider className="mt-10" />
          <p className="mt-6 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            Public pages only. It does not see behind login, PDFs, or real user flows — for that,
            see{" "}
            <Link
              href="/for-agencies"
              className="rounded-sm text-foreground underline underline-offset-4 hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              behind-login scanning for agencies
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
