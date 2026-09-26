import type { ReactNode } from "react";

/**
 * Shared app-shell page header: label-mono eyebrow, display H1, one primary
 * action on the right (DESIGN.md — "consistent page header pattern"). Used by
 * every (app) route so headers read as one system instead of ad-hoc h1s.
 */
export function AppPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0">
        <p className="label-mono">{eyebrow}</p>
        <h1 className="display mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] leading-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
