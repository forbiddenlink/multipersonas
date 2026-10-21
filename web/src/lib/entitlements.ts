import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { planAfterGrace } from "@/lib/plans";

export type Plan = "free" | "pro" | "team";

/** Plans that unlock the persona task-success layer. */
export const PERSONA_PLANS: readonly Plan[] = ["pro", "team"];

/** True iff this plan may run the hosted persona audit. Unknown/null -> false (fail closed). */
export function planAllowsPersonas(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "team";
}

/**
 * Customer-facing plan name. `profiles.plan` stores the entitlement tier ("pro", "team"),
 * which is not what /pricing sells: Solo grants "pro", agency founding grants "team"
 * (lib/plans.ts). Never render the raw slug. Unknown/null reads as Free (fail closed).
 */
export function planDisplayName(plan: string | null | undefined): string {
  if (plan === "pro") return "Solo";
  if (plan === "team") return "Agency founding";
  return "Free";
}

/**
 * One sentence on what the paid plans add over Free, derived from the same limits the app
 * enforces so the copy cannot drift from them. Shown to Free accounts only.
 */
export function planUpgradeSummary(): string {
  return (
    `Solo adds hosted persona task-success runs, scheduled re-scans and up to ${PROJECT_LIMITS.pro} projects. ` +
    "Agency founding adds unlimited projects and white-label report headers."
  );
}

/**
 * Read a profile row with an expired past_due grace window applied to `plan`
 * (planAfterGrace). Selects the grace column alongside `columns` (which must include
 * `plan`); before its migration (Postgres 42703 / PostgREST PGRST204) it falls back to
 * the plain columns. Callers get `plan` already effective, so no reader can forget it.
 */
export async function readProfileWithEffectivePlan<Row extends { plan: string }>(
  supabase: SupabaseClient<Database>,
  userId: string,
  columns: string,
): Promise<{ data: Row | null; error: { code?: string; message?: string } | null }> {
  const read = (cols: string) => supabase.from("profiles").select(cols).eq("id", userId).single();
  let { data, error } = await read(`${columns},access_grace_ends_at,grace_fallback_plan,access_grace_anchors`);
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ data, error } = await read(columns));
  if (error || !data) return { data: null, error: error ?? { message: "no row" } };
  const row = data as unknown as Row & { access_grace_ends_at?: string | null; grace_fallback_plan?: string | null; access_grace_anchors?: unknown };
  const { access_grace_ends_at, grace_fallback_plan, access_grace_anchors, ...rest } = row;
  return { data: { ...(rest as unknown as Row), plan: planAfterGrace(row.plan, access_grace_ends_at, grace_fallback_plan, Date.now(), access_grace_anchors) }, error: null };
}

async function readStoredPlan(supabase: SupabaseClient<Database>, userId: string): Promise<string> {
  const { data } = await readProfileWithEffectivePlan<{ plan: string }>(supabase, userId, "plan");
  return data?.plan ?? "free";
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
  const stored = await readStoredPlan(supabase, userId);
  return planAllowsPersonas(stored) ? (stored as Plan) : "free";
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
  const stored = await readStoredPlan(supabase, userId);
  return stored === "pro" || stored === "team" ? stored : "free";
}
