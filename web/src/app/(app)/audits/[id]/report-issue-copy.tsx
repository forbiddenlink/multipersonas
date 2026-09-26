"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildIssueMarkdown, type IssueFindingInput } from "./report-issue-markdown";

/**
 * "Copy as issue" — copies a Markdown issue body (title + evidence) ready to paste into
 * GitHub, Jira, or Linear. `navigator.clipboard.writeText` only — no `document.execCommand`
 * fallback (deprecated, and silently no-ops in more contexts than it saves). When the
 * Clipboard API is unavailable or the write is rejected (insecure context, denied
 * permission, no user-activation), the button shows a visible, non-dismissing failure
 * state instead of pretending to succeed. Silent success on the happy path (DESIGN.md
 * §Interaction): the visible label flips to "Copied" briefly, and an aria-live region
 * announces it for screen-reader users, but nothing pops a toast.
 */
export function ReportIssueCopy({
  finding,
  className = "",
}: {
  finding: IssueFindingInput;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const copy = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      setState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildIssueMarkdown(finding));
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }, [finding]);

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {state === "copied" ? "Copied" : "Copy as issue"}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Copied" : ""}
      </span>
      {state === "error" ? (
        <span role="alert" className="font-mono text-[11px] text-[var(--redline)]">
          ■ Could not copy. Select and copy the finding manually.
        </span>
      ) : null}
    </div>
  );
}
