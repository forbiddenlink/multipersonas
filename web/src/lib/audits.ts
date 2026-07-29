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
  project_id?: string | null;
}

export interface ListAuditsOptions {
  /** Scope to a single project's saved runs (e.g. the project detail page). */
  projectId?: string;
  limit?: number;
}

/**
 * List a user's saved audits, newest first. RLS scopes rows to the caller. Writes happen
 * in the worker (worker/src/index.ts) when a job completes — see the Phase 2 worker split.
 */
export async function listAudits(
  supabase: SB,
  options: ListAuditsOptions | number = 20,
): Promise<AuditListItem[]> {
  const { projectId, limit } =
    typeof options === "number" ? { projectId: undefined, limit: options } : options;

  let query = supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids,project_id")
    .order("created_at", { ascending: false })
    .limit(limit ?? 20);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data } = await query;
  return data ?? [];
}
