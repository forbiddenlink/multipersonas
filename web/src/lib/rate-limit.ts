import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_LIMITS, type RateLimitType } from "@/lib/limits";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Durable, shared rate limit backed by the Postgres RPC consume_rate_limit. Replaces the
 * old in-process Map (per-instance, resettable, X-Forwarded-For-spoofable).
 *
 * Degrades on missing service key (dev) or transient RPC error by ALLOWING — a rate limit
 * is availability protection, not the money guard, so a DB blip should not take the app
 * down. The spend cap (reserveSpend) is the money guard and fails closed instead.
 */
export async function consumeRateLimit(
  key: string,
  type: RateLimitType,
): Promise<RateLimitResult> {
  const { max, windowSeconds } = RATE_LIMITS[type];
  const admin = createAdminClient();

  if (!admin) {
    console.warn(
      "[rate-limit] SUPABASE_SERVICE_ROLE_KEY not set — durable rate limiting disabled (allowing). Required before public deploy.",
    );
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] RPC failed, allowing:", error.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: data === true, retryAfterSeconds: data ? 0 : windowSeconds };
}
