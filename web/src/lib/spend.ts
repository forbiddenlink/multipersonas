import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CALLER_DAILY_CALL_CAP, DAILY_MODEL_CALL_CAP, estimatedCallsFor } from "@/lib/limits";

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
export async function reserveSpend(personaCount: number, callerKey: string): Promise<boolean> {
  const admin = createAdminClient();

  if (!admin) {
    console.warn(
      "[spend] SUPABASE_SERVICE_ROLE_KEY not set — spend cap disabled (allowing). Required before public deploy.",
    );
    return true;
  }

  const planned = estimatedCallsFor(personaCount);
  // Reserve against BOTH the global daily cap and this caller's daily sub-cap, atomically.
  // callerKey is the same identity used for rate limiting (user id, or anon:<ip>), so one
  // actor cannot consume the whole global budget and deny audits to everyone else.
  const { data, error } = await admin.rpc("reserve_model_calls_scoped", {
    p_calls: planned,
    p_cap: DAILY_MODEL_CALL_CAP,
    p_caller: callerKey,
    p_caller_cap: CALLER_DAILY_CALL_CAP,
  });

  if (error) {
    console.error("[spend] reserve RPC failed, refusing run:", error.message);
    return false;
  }

  return data === true;
}

/**
 * Refund a prior reservation. Call this when a run never happens after a successful
 * reserveSpend — e.g. enqueue fails. Best-effort: a failure to release must not fail
 * the request (the daily counter self-heals at UTC midnight regardless), so errors are
 * logged, not thrown. No-op when enforcement isn't configured.
 */
export async function releaseSpend(personaCount: number): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const planned = estimatedCallsFor(personaCount);
  const { error } = await admin.rpc("release_model_calls", { p_calls: planned });
  if (error) {
    console.error("[spend] release RPC failed (reservation will expire at UTC midnight):", error.message);
  }
}
