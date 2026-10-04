"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pollAuditJob, type JobStatus } from "@/lib/audit-client";

type Phase =
  | { kind: "idle" }
  | { kind: "queueing" }
  | { kind: "watching"; status: JobStatus | null }
  | { kind: "done"; runId: string | null }
  | { kind: "stopped-watching" }
  | { kind: "error"; message: string }
  | { kind: "upgrade" };

/**
 * Re-run a finished run: same URL, same personas, same project. It posts to the same
 * /api/audit route as a first run, so the plan gate, rate limit and spend reservation all
 * apply server-side. When the run belongs to a project, the route attaches that project's
 * saved task to the new job; this component never sends a task itself.
 */
export function RetestButton({
  url,
  personaIds,
  projectId,
}: {
  url: string;
  personaIds: string[];
  projectId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = phase.kind === "queueing" || phase.kind === "watching";

  async function handleClick() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: "queueing" });
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, personaIds, ...(projectId ? { projectId } : {}) }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setPhase({ kind: "upgrade" });
        return;
      }
      if (!res.ok || typeof data.jobId !== "string") {
        setPhase({ kind: "error", message: data.error || "Could not queue the retest. Please try again." });
        return;
      }
      setPhase({ kind: "watching", status: null });
      const outcome = await pollAuditJob(data.jobId, ctrl.signal, (status) => {
        if (!ctrl.signal.aborted) setPhase({ kind: "watching", status });
      });
      if (ctrl.signal.aborted) return;
      if (outcome.status === "completed") {
        setPhase({ kind: "done", runId: outcome.result.runId ?? null });
      } else if (outcome.status === "failed") {
        setPhase({ kind: "error", message: outcome.error });
      } else {
        setPhase({ kind: "stopped-watching" });
      }
    } catch {
      if (ctrl.signal.aborted) return;
      setPhase({ kind: "error", message: "Could not reach the server. Please try again." });
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" size="lg" onClick={handleClick} disabled={busy}>
        {phase.kind === "queueing" ? "Queueing…" : "Retest"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {phase.kind === "queueing" ? "Queueing the retest." : null}
        {phase.kind === "watching"
          ? phase.status === "running"
            ? "Retest is scanning. You can leave this page; the run is saved to your history."
            : "Retest queued. You can leave this page; the run is saved to your history."
          : null}
        {phase.kind === "stopped-watching"
          ? "Still running. Check your history in a few minutes."
          : null}
        {phase.kind === "done" ? (
          <>
            Retest finished.{" "}
            {phase.runId ? (
              <Link href={`/audits/${phase.runId}`} className="text-link font-medium">
                Open the new run
              </Link>
            ) : (
              <Link href="/dashboard" className="text-link font-medium">
                Open your history
              </Link>
            )}
          </>
        ) : null}
      </div>
      {phase.kind === "upgrade" ? (
        <p className="text-sm text-muted-foreground">
          Hosted retests come with the Solo and Agency founding plans.{" "}
          <Link href="/pricing" className="text-link">
            See plans
          </Link>
        </p>
      ) : null}
      {phase.kind === "error" ? (
        <p role="alert" className="text-sm text-[var(--redline)]">
          <span aria-hidden="true">■ </span>
          {phase.message}
        </p>
      ) : null}
    </div>
  );
}
