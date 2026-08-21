import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

export interface EnqueueAuditJobInput {
  url: string;
  userId?: string | null;
  projectId?: string | null;
  personaIds?: string[];
  kind?: "audit" | "grade";
  reservedCalls?: number;
  callerKey?: string | null;
}

export async function enqueueAuditJob(
  supabase: SB,
  input: EnqueueAuditJobInput,
): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("enqueue_audit_job", {
    p_url: input.url,
    p_user_id: input.userId ?? null,
    p_project_id: input.projectId ?? null,
    p_persona_ids: input.personaIds ?? [],
    p_kind: input.kind ?? "audit",
    p_reserved_calls: input.reservedCalls ?? 0,
    p_caller_key: input.callerKey ?? null,
  });

  return {
    id: data ?? null,
    error: error ? new Error(error.message) : null,
  };
}
