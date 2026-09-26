"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildIssueChecklist, type IssueFindingInput } from "./report-issue-markdown";

/**
 * "Copy all open findings" — one Markdown checklist (`- [ ]` per finding) for pasting
 * into a tracker as a single tracking issue. Same clipboard contract as
 * `ReportIssueCopy`: `navigator.clipboard.writeText` only, visible failure state, no
 * `document.execCommand`. Disabled (not hidden) when there is nothing open, so the
 * control's position on the page stays stable.
 */
export function ReportIssueCopyAll({
  findings,
  className = "",
}: {
  findings: IssueFindingInput[];
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const copy = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      setState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildIssueChecklist(findings));
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }, [findings]);

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copy}
        disabled={findings.length === 0}
      >
        {state === "copied" ? "Copied" : `Copy all open findings (${findings.length})`}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Copied" : ""}
      </span>
      {state === "error" ? (
        <span role="alert" className="font-mono text-[11px] text-[var(--redline)]">
          ■ Could not copy. Copy each finding individually instead.
        </span>
      ) : null}
    </div>
  );
}
