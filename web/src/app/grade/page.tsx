import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
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
      <SiteHeader />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            free · public · no signup
          </p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] tracking-tight text-balance">
            Get an honest accessibility grade.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Enter any public URL. We run <strong className="font-medium text-foreground">axe-core</strong>{" "}
            against every page we can reach and grade it from the real ratio of passed
            checks to violations — never a fabricated score.
          </p>

          <div className="mt-10">
            <GradeForm />
          </div>

          <BoxDivider className="mt-10" />
          <p className="mt-6 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            Scans public pages only. It does not see behind login, PDFs, or real user
            flows — for that, see{" "}
            <Link
              href="/for-agencies"
              className="text-foreground underline underline-offset-4 hover:text-[var(--primary)]"
            >
              behind-login scanning for agencies
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
