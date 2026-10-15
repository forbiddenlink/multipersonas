"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics";
import { GradeOfferLink } from "@/components/grade-offer-link";

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
  soloOpen = false,
  trialDays = 0,
}: {
  signedIn: boolean;
  pagesScanned: number;
  entryUrl: string;
  /** True only when the Solo Stripe price is configured; the offer is never shown for a closed plan. */
  soloOpen?: boolean;
  trialDays?: number;
}) {
  const pageLabel = `${pagesScanned} public page${pagesScanned === 1 ? "" : "s"}`;
  const projectPath = `/projects?url=${encodeURIComponent(entryUrl)}`;

  return (
    <div className="sheet margin-rule space-y-5 p-6 pl-12 sm:p-7 sm:pl-14">
      <div>
        <h2 className="label-mono">Next steps</h2>
        <p className="mt-2 max-w-lg font-medium leading-relaxed">
          {signedIn ? "Re-grade after you fix it." : "Save this site and re-grade after you fix it."}{" "}
          <span className="font-normal text-muted-foreground">
            {signedIn
              ? "Your dashboard lists your saved grades."
              : "Your dashboard lists each saved grade, so you can compare the next one to this."}
          </span>
        </p>
        <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
          Scanned {pageLabel} only. It does not see behind login, PDFs, or a real checkout,
          where users often get stuck.
        </p>
      </div>
      <ul className="space-y-1.5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
        <li>Keyboard-only navigation through the highest-value path.</li>
        <li>Screen reader pass on forms, dialogs, menus, and checkout states.</li>
        <li>Logged-in pages, PDFs, and multi-step flows this scan cannot reach.</li>
      </ul>
      <div className="grade-print-hide flex flex-col gap-4 border-t border-border pt-5">
        {signedIn ? (
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "default", size: "lg", className: "self-start" })}
            onClick={() => trackProductEvent("grade_save_clicked", { signed_in: true })}
          >
            Open dashboard
          </Link>
        ) : (
          <Link
            href={`/auth/signup?returnTo=${encodeURIComponent(projectPath)}`}
            className={buttonVariants({ variant: "default", size: "lg", className: "self-start" })}
            onClick={() => trackProductEvent("grade_save_clicked", { signed_in: false })}
          >
            Save and track this site
          </Link>
        )}
        <ul className="flex flex-col gap-x-6 gap-y-0 text-sm sm:flex-row sm:flex-wrap">
          <li>
            <Link
              href="/guides/ci-accessibility-gate"
              className="text-link inline-flex min-h-11 items-center"
              onClick={() => trackProductEvent("grade_cli_guide_clicked", { from: "grade_result" })}
            >
              Scan a logged-in flow with the CLI
            </Link>
          </li>
          <li>
            <Link href="/guides/screen-reader-testing" className="text-link inline-flex min-h-11 items-center">
              Manual testing guide
            </Link>
          </li>
        </ul>
      </div>
      {soloOpen ? (
        <div className="grade-print-hide border-t border-border pt-5">
          <p className="max-w-lg font-medium leading-relaxed">
            Keep this grade from slipping.{" "}
            <span className="font-normal text-muted-foreground">
              Solo re-scans this site on a schedule, emails you what changed, and shows which
              findings are new, cleared, or still open. $39 a month
              {trialDays > 0 ? `, with a ${trialDays}-day free trial` : ""}.
            </span>
          </p>
          <GradeOfferLink
            href="/pricing#solo"
            offer="solo"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4" })}
          >
            See the Solo plan
          </GradeOfferLink>
        </div>
      ) : null}
      {!signedIn ? (
        <p className="redline-note grade-print-hide">
          Create an account and this grade lands on your dashboard. The CLI scans behind
          login today, where a client password never leaves your machine.
        </p>
      ) : null}
    </div>
  );
}
