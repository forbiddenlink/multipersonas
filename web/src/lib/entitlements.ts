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

/**
 * How many projects a plan may hold. `null` means unlimited.
 *
 * This is the enforced difference between the two paid tiers, not a marketing line:
 * Solo grants "pro", agency founding grants "team" (see lib/plans.ts). Keep this in
 * step with the /pricing copy — a limit stated on the page and not enforced here is
 * the same defect as one enforced here and not stated there.
 */
export const PROJECT_LIMITS: Record<Plan, number | null> = {
  // Free keeps one project so the hosted workspace is genuinely try-able. The cap only
  // blocks CREATING past it: anyone already over the line keeps every project they have.
  free: 1,
  pro: 5,
  team: null,
};

export function projectLimitFor(plan: Plan): number | null {
  return PROJECT_LIMITS[plan];
}

/** True iff the plan may put its own agency name on an exported report. */
export function planAllowsReportBranding(plan: string | null | undefined): boolean {
  return plan === "team";
}

/**
 * Read the caller's plan without collapsing "team" into "pro". `getSessionPlan` exists
 * for the persona gate, where the two are equivalent; tier-sensitive checks need the
 * real value. Anonymous callers, a missing row, or any read error resolve to "free".
 */
export async function getExactPlan(
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
  return data.plan === "pro" || data.plan === "team" ? data.plan : "free";
}
