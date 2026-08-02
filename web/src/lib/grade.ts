import { createClient } from "@/lib/supabase/server";

// Read a public grader result by its share token. grader_scans has a public-read
// RLS policy (results are shared by unguessable token), so the ordinary server
// client can read it — no admin/service role needed.
export async function getGraderScan(token: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grader_scans")
    .select("token, entry_url, status, report, pages_visited, error, created_at")
    .eq("token", token)
    .single();
  return data ?? null;
}
