import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

export interface AuditEventInput {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Json;
}

export async function logAuditEvent(
  supabase: SB,
  input: AuditEventInput,
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[audit-log] insert failed:", error.message);
  }
}
