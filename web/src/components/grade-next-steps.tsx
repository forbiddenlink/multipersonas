"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics";

/**
 * The conversion cluster on a finished public grade.
 *
 * Homepage copy promises that signing up after a grade lands that scan on the
 * dashboard. Until now that ask lived only at the bottom of `/`, not on the
 * result itself — the one moment the visitor has just been told, in writing,
 * that the free scan cannot see behind login.
 */
export function GradeNextSteps({
  signedIn,
  pagesScanned,
  entryUrl,
}: {
  signedIn: boolean;
  pagesScanned: number;
  entryUrl: string;
}) {
  const pageLabel = `${pagesScanned} public page${pagesScanned === 1 ? "" : "s"}`;
  const projectPath = `/projects?url=${encodeURIComponent(entryUrl)}`;

  return (
    <div className="sheet margin-rule space-y-5 p-6 pl-12 sm:p-7 sm:pl-14">
      <div>
        <p className="label-mono">Next steps</p>
        <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
          Scanned {pageLabel} only. It does not see behind login, PDFs, or a real checkout:
          the states where most accessibility risk sits.
        </p>
      </div>
      <ul className="space-y-1.5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
        <li>Keyboard-only navigation through the highest-value path.</li>
        <li>Screen reader pass on forms, dialogs, menus, and checkout states.</li>
        <li>Logged-in pages, PDFs, and multi-step flows this scan cannot reach.</li>
      </ul>
      <div className="grade-print-hide flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
        {signedIn ? (
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "default", size: "sm" })}
            onClick={() => trackProductEvent("grade_save_clicked", { signed_in: true })}
          >
            Open dashboard
          </Link>
        ) : (
          <Link
            href={`/auth/signup?returnTo=${encodeURIComponent(projectPath)}`}
            className={buttonVariants({ variant: "default", size: "sm" })}
            onClick={() => trackProductEvent("grade_save_clicked", { signed_in: false })}
          >
            Save this grade
          </Link>
        )}
        <Link
          href="/guides/ci-accessibility-gate"
          className={buttonVariants({ variant: "outline", size: "sm" })}
          onClick={() => trackProductEvent("grade_cli_guide_clicked", { from: "grade_result" })}
        >
          Scan a logged-in flow with the CLI
        </Link>
        <Link
          href="/for-agencies#early-access"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          onClick={() => trackProductEvent("grade_offer_clicked", { from: "grade_result" })}
        >
          See founding access
        </Link>
        <Link
          href="/guides/screen-reader-testing"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Manual testing guide
        </Link>
      </div>
      {!signedIn ? (
        <p className="redline-note grade-print-hide">
          Create an account and this grade lands on your dashboard. The CLI scans behind
          login today, where a client password never leaves your machine.
        </p>
      ) : null}
    </div>
  );
}
