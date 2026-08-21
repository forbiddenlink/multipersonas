import { createAdminClient } from "@/lib/supabase/admin";

export function gradeStatusFromJob({
  scanStatus,
  jobStatus,
}: {
  scanStatus: string;
  jobStatus: string | null;
}): string {
  return jobStatus ?? scanStatus;
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
  let jobError: string | null = null;
  if (data.job_id) {
    const { data: job } = await admin
      .from("audit_jobs")
      .select("status,error")
      .eq("id", data.job_id)
      .single();
    jobStatus = job?.status ?? null;
    jobError = job?.error ?? null;
  }

  return {
    ...data,
    status: gradeStatusFromJob({ scanStatus: data.status, jobStatus }),
    error: data.error ?? jobError,
  };
}
