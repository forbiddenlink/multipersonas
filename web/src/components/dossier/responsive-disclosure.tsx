import type { ReactNode } from "react";

/**
 * Shows its children in full from `md` up, and behind a native `<details>` below it. No
 * JavaScript: CSS switches which copy is displayed, and the hidden copy is `display: none`,
 * so assistive tech reads the content once. Use it for evidence a phone does not need
 * unrolled, such as a sample widget or a reference table.
 */
export function ResponsiveDisclosure({
  summary,
  children,
  className = "",
}: {
  /** The visible one-line label of the collapsed row on small screens. */
  summary: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{children}</div>
      <details className="group border-y border-border md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
          <span>{summary}</span>
          <span aria-hidden="true" className="shrink-0 font-mono font-normal text-muted-foreground">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>
        <div className="pb-4">{children}</div>
      </details>
    </div>
  );
}
