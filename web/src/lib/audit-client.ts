import type { AuditResponse } from "@/components/audit-results";

/** What the worker has reported for the job. `null` means we have not heard back yet. */
export type JobStatus = "queued" | "running";

export type PollOutcome =
  | { status: "completed"; result: AuditResponse }
  | { status: "failed"; error: string }
  | { status: "timeout" };

/** Poll a queued audit job until it completes, fails, or the client-side deadline
 * passes. The run happens in a worker, not the request, so the browser can take as
 * long as it needs — a "timeout" outcome means we stopped watching, not that the job
 * died, so the caller decides whether to keep the jobId around for a manual re-check. */
export async function pollAuditJob(
  jobId: string,
  signal?: AbortSignal,
  onStatus?: (status: JobStatus) => void,
): Promise<PollOutcome> {
  // A real multi-persona run (browser + axe + LLM per persona) routinely runs several
  // minutes; the old 3-minute deadline made the timeout branch the *default* outcome for
  // genuine scans. Ten minutes covers the worst case, and the worker keeps running past
  // it regardless (a "timeout" only means we stopped watching).
  const deadlineMs = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, 2500));
    if (signal?.aborted) return { status: "timeout" };
    let data: { status?: string; result?: AuditResponse; error?: string };
    try {
      const res = await fetch(`/api/audit/${jobId}`, { signal });
      if ([401, 403, 404].includes(res.status)) {
        return {
          status: "failed",
          error: "This audit is unavailable for this account. Start a new audit or sign in to the account that created it.",
        };
      }
      if (!res.ok) continue;
      data = await res.json();
    } catch (err) {
      // AbortError = navigated away or component unmounted — stop cleanly.
      if (err instanceof DOMException && err.name === "AbortError") {
        return { status: "timeout" };
      }
      // Transient network error (offline blip, dropped connection). The job is still
      // running server-side, so keep polling rather than throwing and freezing the UI.
      continue;
    }
    if (data.status === "queued" || data.status === "running") {
      onStatus?.(data.status);
    }
    if (data.status === "completed" && data.result) {
      return { status: "completed", result: data.result };
    }
    if (data.status === "failed") {
      return {
        status: "failed",
        error: data.error || "The audit failed. Please try again.",
      };
    }
  }
  return { status: "timeout" };
}
