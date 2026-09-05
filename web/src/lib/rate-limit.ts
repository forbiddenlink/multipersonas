import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_LIMITS, type RateLimitType } from "@/lib/limits";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  unavailable?: boolean;
}

/**
 * Durable, shared rate limit backed by the Postgres RPC consume_rate_limit. Replaces the
 * old in-process Map (per-instance, resettable, X-Forwarded-For-spoofable).
 *
 * Fail closed when enforcement is unavailable. A missing RPC or permission drift
 * must not silently remove abuse protection from public write endpoints.
 */
export async function consumeRateLimit(
  key: string,
  type: RateLimitType,
): Promise<RateLimitResult> {
  const { max, windowSeconds } = RATE_LIMITS[type];
  const admin = createAdminClient();

  if (!admin) {
    console.warn(
      "[rate-limit] SUPABASE_SERVICE_ROLE_KEY not set — durable rate limiting unavailable (refusing).",
    );
    return { allowed: false, retryAfterSeconds: 60, unavailable: true };
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] RPC failed, refusing:", error.message);
    return { allowed: false, retryAfterSeconds: 60, unavailable: true };
  }

  return { allowed: data === true, retryAfterSeconds: data ? 0 : windowSeconds };
}
