import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";

export const metadata: Metadata = {
  title: "Case file not found",
  robots: { index: false, follow: false },
};

// Reached when a grade token doesn't resolve to a scan — the link is wrong, or the
// case file was never opened. A blank sheet with one sentence and one action
// (DESIGN.md empty-state rule), not a bare 404.
export default function GradeTokenNotFound() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />
      <main id="main" className="flex-1">
        <div className="frame-narrow py-14 sm:py-20">
          <h1 className="sr-only">Case file not found</h1>
          <div className="file-tab">
            <span>Case file</span>
            <span className="text-foreground/40">·</span>
            <span>not found</span>
          </div>
          <div className="sheet relative -mt-px p-6 sm:p-8">
            <EmptyPrompt
              prompt="This grade link doesn't match a case on file."
              hint="The link may be mistyped, or the grade may not exist. Run a fresh grade instead."
              action={
                <Link href="/grade" className="text-link">
                  Grade a site free
                </Link>
              }
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
