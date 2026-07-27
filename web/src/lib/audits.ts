import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

export interface AuditListItem {
  id: string;
  url: string;
  created_at: string;
  task_success_achieved: number | null;
  task_success_total: number | null;
  persona_ids: string[];
}

/**
 * List a user's saved audits, newest first. RLS scopes rows to the caller. Writes happen
 * in the worker (worker/src/index.ts) when a job completes — see the Phase 2 worker split.
 */
export async function listAudits(supabase: SB, limit = 20): Promise<AuditListItem[]> {
  const { data } = await supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
