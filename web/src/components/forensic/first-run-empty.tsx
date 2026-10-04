import Link from "next/link";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";

const PRIMARY_LINK =
  "inline-flex h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Dashboard empty state. It must only point at controls the viewer can actually use:
 * the hosted run form is shown to paid plans only (api/audit answers 402 otherwise), so a
 * Free account is sent to the free public grade, the CLI, and the plans page instead.
 */
export function FirstRunEmpty({ canRunHosted }: { canRunHosted: boolean }) {
  if (canRunHosted) {
    return (
      <EmptyPrompt
        prompt="Run your first audit to see what needs attention."
        hint="Enter a public URL in the New scan form and its findings land here."
      />
    );
  }
  return (
    <EmptyPrompt
      prompt="Grade a public site to see what needs attention."
      hint="Hosted runs come with the Solo and Agency founding plans. The public grade and the CLI are free, and behind-login scans run in the CLI on your machine."
      action={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/grade" className={PRIMARY_LINK}>
            Grade a public site
          </Link>
          <Link href="/docs" className="text-link text-sm">
            Scan behind login with the CLI
          </Link>
          <Link href="/pricing" className="text-link text-sm">
            See plans
          </Link>
        </div>
      }
    />
  );
}
