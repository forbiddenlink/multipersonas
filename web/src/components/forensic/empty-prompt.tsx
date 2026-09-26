import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty state — a blank sheet with one sentence and one action (DESIGN.md).
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
        "sheet px-6 py-8 sm:px-8",
        className,
      )}
    >
      <p className="label-mono">Nothing on file yet</p>
      <p className="display mt-2 text-xl leading-snug text-card-foreground">{prompt}</p>
      {hint ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
