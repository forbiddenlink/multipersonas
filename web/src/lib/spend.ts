import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_MODEL_CALL_CAP, estimatedCallsFor } from "@/lib/limits";

/**
 * Reserve the estimated model-call budget for a run against today's global cap, atomically.
 * Returns false if the reservation would exceed the cap (caller must reject the run) — a
 * reserve-then-run guard so a burst of concurrent requests can't collectively overspend.
 *
 * Fail model: when enforcement is CONFIGURED but the RPC errors, fail CLOSED (refuse) —
 * this is the money guard. When it is simply NOT configured (no service key, e.g. local
 * dev), there is nothing to enforce, so allow with a loud warning; the deploy runbook
 * (docs/PLAN-2026-07-26-phase2) requires the key before any public deploy.
 */
export async function reserveSpend(personaCount: number): Promise<boolean> {
  const admin = createAdminClient();

  if (!admin) {
    console.warn(
      "[spend] SUPABASE_SERVICE_ROLE_KEY not set — spend cap disabled (allowing). Required before public deploy.",
    );
    return true;
  }

  const planned = estimatedCallsFor(personaCount);
  const { data, error } = await admin.rpc("reserve_model_calls", {
    p_calls: planned,
    p_cap: DAILY_MODEL_CALL_CAP,
  });

  if (error) {
    console.error("[spend] reserve RPC failed, refusing run:", error.message);
    return false;
  }

  return data === true;
}
