import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("token, entry_url, status, report, pages_visited, error, created_at")
    .eq("token", token)
    .single();
  return data ?? null;
}
