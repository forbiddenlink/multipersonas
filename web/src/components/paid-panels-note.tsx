import Link from "next/link";
import { PROJECT_LIMITS } from "@/lib/entitlements";

/**
 * One honest summary in place of the paid-only panels on a Free project page: no disabled
 * forms, no empty tiles. Every item here is a feature the paid plans actually have; the cap
 * comes from PROJECT_LIMITS so the page cannot drift from what the app enforces.
 */
export function PaidPanelsNote() {
  return (
    <section aria-labelledby="paid-panels-heading" className="sheet p-5">
      <h2 id="paid-panels-heading" className="display text-xl leading-snug">
        On Solo and up
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Free keeps the public grade and this project. Paid plans add:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Hosted persona task-success runs on this site, with a task you define.</li>
        <li>Saved runs with the change since the last run.</li>
        <li>Owners and status on each finding, as a fix queue.</li>
        <li>Scheduled re-scans, and up to {PROJECT_LIMITS.pro} projects.</li>
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/pricing" className="text-link">
          See plans and pricing
        </Link>
      </p>
    </section>
  );
}
