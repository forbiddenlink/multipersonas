import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createWorkerClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        // The scan-process timeout does not cover persistence or queue RPCs.
        // Keep this signal alive through response-body reads and storage uploads.
        const deadline = AbortSignal.timeout(30_000);
        const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
        return fetch(input, {
          ...init,
          signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
        });
      },
    },
  });
}
