import { createAdminClient } from "@/lib/supabase/admin";

/** User-facing copy when a grade job is dead-lettered while the scan row still
 * looks live. Keep in sync with worker/src/index.ts `publicJobError` timeout branch
 * and migration 020's grader_scans update. */
export const GRADE_JOB_FAILED_MESSAGE =
  "The scan timed out. Try again, or try a smaller site.";

/**
 * If the public scan is still queued/running but its audit_jobs row has already
 * been failed (worker crash, in-process timeout, reaper dead-letter), the poll
 * page would spin forever. Map that to a terminal failed scan.
 */
export function reconcileGradeScan(
  scan: { status: string; error: string | null },
  jobStatus: string | null,
): { status: string; error: string | null; persist: boolean } {
  if (scan.status !== "queued" && scan.status !== "running") {
    return { status: scan.status, error: scan.error, persist: false };
  }
  if (jobStatus === "failed") {
    return { status: "failed", error: GRADE_JOB_FAILED_MESSAGE, persist: true };
  }
  return { status: scan.status, error: scan.error, persist: false };
}

// Read a grader result by its share token. grader_scans has NO public-read RLS policy
// (migration 016 removed the `using(true)` that let anyone enumerate every scan via the
// anon key), so reads go through the service-role client scoped to the exact token — the
// same capability-URL pattern as the audit_jobs poll. The token is an unguessable UUID;
// possession of it is the authorization. Returns null when the service key is unset.
export async function getGraderScan(token: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("grader_scans")
    .select("token, entry_url, status, report, pages_visited, error, created_at, job_id")
    .eq("token", token)
    .single();
  if (!data) return null;

  let jobStatus: string | null = null;
  if ((data.status === "queued" || data.status === "running") && data.job_id) {
    const { data: job } = await admin
      .from("audit_jobs")
      .select("status")
      .eq("id", data.job_id)
      .single();
    jobStatus = job?.status ?? null;
  }

  const reconciled = reconcileGradeScan(data, jobStatus);
  if (reconciled.persist) {
    await admin
      .from("grader_scans")
      .update({ status: reconciled.status, error: reconciled.error })
      .eq("token", token)
      .in("status", ["queued", "running"]);
    return { ...data, status: reconciled.status, error: reconciled.error };
  }

  return data;
}
