import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type Plan = "free" | "pro" | "team";

/** Plans that unlock the persona task-success layer. */
export const PERSONA_PLANS: readonly Plan[] = ["pro", "team"];

/** True iff this plan may run the hosted persona audit. Unknown/null -> false (fail closed). */
export function planAllowsPersonas(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "team";
}

/**
 * Read the caller's plan from profiles via the RLS-scoped server client. Anonymous callers,
 * a missing row, or any read error resolve to "free" so the gate fails closed (a pro user
 * briefly seeing the paywall is safe; the inverse would leak the paid layer). Never uses the
 * service-role client.
 */
export async function getSessionPlan(
  supabase: SupabaseClient<Database>,
  userId: string | null,
): Promise<Plan> {
  if (!userId) return "free";
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (error || !data) return "free";
  return planAllowsPersonas(data.plan) ? (data.plan as Plan) : "free";
}
