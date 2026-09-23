import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export type ClaimedGrade = {
  token: string;
  entry_url: string;
  status: string;
  letter: string | null;
  created_at: string;
};

export function gradeLetterFromReport(report: Json | null): string | null {
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  const letter = (report as { grade?: unknown }).grade;
  return typeof letter === "string" ? letter : null;
}

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
  const { data, error } = await admin
    .from("grader_scans")
    .select("token, entry_url, status, report, pages_visited, error, created_at, job_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error("Could not load scan result.");
  if (!data) return null;

  let jobStatus: string | null = null;
  let jobError: string | null = null;
  if (data.job_id) {
    const { data: job, error: jobReadError } = await admin
      .from("audit_jobs")
      .select("status,error")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jobReadError) throw new Error("Could not load scan status.");
    jobStatus = job?.status ?? null;
    jobError = job?.error ?? null;
  }

  return {
    ...data,
    status: gradeStatusFromJob({ scanStatus: data.status, jobStatus }),
    error: data.error ?? jobError,
  };
}

export async function listGraderScansForUser(userId: string): Promise<ClaimedGrade[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("grader_scans")
    .select("token, entry_url, status, report, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((row) => ({
    token: row.token,
    entry_url: row.entry_url,
    status: row.status,
    letter: gradeLetterFromReport(row.report),
    created_at: row.created_at,
  }));
}
