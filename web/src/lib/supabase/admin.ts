import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cached: SupabaseClient<Database> | null | undefined;

/**
 * Service-role Supabase client for trusted server-side enforcement (durable rate limit,
 * spend cap). Bypasses RLS and can call the service-only RPCs whose EXECUTE is revoked
 * from anon/authenticated. Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured —
 * callers must decide their degraded behaviour (rate limit allows + warns; spend cap
 * refuses). Never import this from client code; it is server-only.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
