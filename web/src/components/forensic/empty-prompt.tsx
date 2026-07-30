import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Terminal-native empty state — a prompt line, not a dashed marketing card.
 * Matches the forensic empty/loading/error language (spec §6).
 */
export function EmptyPrompt({
  prompt,
  hint,
  action,
  className,
}: {
  prompt: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card font-mono text-sm",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">┌─ </span>
        empty
      </div>
      <div className="px-4 py-5">
        <p className="text-card-foreground">
          <span className="select-none text-[var(--primary)]">›&nbsp;</span>
          {prompt}
        </p>
        {hint ? (
          <p className="mt-2 pl-3.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
        {action ? <div className="mt-4 pl-3.5">{action}</div> : null}
      </div>
    </div>
  );
}
