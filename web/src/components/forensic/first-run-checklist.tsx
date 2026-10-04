import Link from "next/link";
import type { FirstRunStep } from "@/lib/first-run-steps";

const PRIMARY_LINK =
  "inline-flex h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Free first run as a checklist on the dashboard: grade, save as a project, re-grade after a
 * fix. Each step says Done or To do in text. Only the first open step is the filled primary,
 * so there is one primary per view; later open steps are plain links.
 */
export function FirstRunChecklist({ steps }: { steps: FirstRunStep[] }) {
  const nextIndex = steps.findIndex((s) => !s.done);
  return (
    <div className="sheet px-6 py-6 sm:px-8">
      <p className="label-mono">Free first run</p>
      <h2 className="display mt-2 text-xl leading-snug text-card-foreground">
        Grade, save, re-grade
      </h2>
      <ol className="mt-4 border-t-2 border-foreground">
        {steps.map((step, i) => (
          <li key={step.label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <span aria-hidden="true" className="display text-2xl leading-none tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className={step.done ? "text-muted-foreground line-through" : "font-medium"}>{step.label}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  <span aria-hidden="true">{step.done ? "✓ " : "□ "}</span>
                  {step.done ? "Done" : "To do"}
                </p>
              </div>
            </div>
            {step.done ? null : i === nextIndex ? (
              <Link href={step.href} className={PRIMARY_LINK}>
                {step.action}
              </Link>
            ) : (
              <Link href={step.href} className="text-link text-sm">
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        Hosted persona runs come with the Solo and Agency founding plans. The public grade and the CLI are
        free, and behind-login scans run in the CLI on your machine.{" "}
        <Link href="/docs" className="text-link">
          Scan behind login with the CLI
        </Link>
      </p>
    </div>
  );
}
