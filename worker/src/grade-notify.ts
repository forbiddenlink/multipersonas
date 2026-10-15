import type { SupabaseClient } from "@supabase/supabase-js";

export type GradeNotifyResult = "skipped" | "sent" | "failed";

/**
 * Tell the web app a public grade has reached a terminal state, so it can send the one
 * "email me this grade" message if the visitor asked for it.
 *
 * The worker never sees an address: it passes only the grade token to an authenticated web
 * endpoint (same CRON_SECRET bearer as the cron routes), and the web app decides whether
 * anyone asked. That keeps the mail provider key and the address table out of this service.
 *
 * Best-effort and never throws: a grade must not fail because a notification could not be
 * sent. A missed call is repaired by the web app's daily sweep. Off unless both
 * GRADE_NOTIFY_URL and CRON_SECRET are set.
 */
export async function notifyGradeFinished(
  supabase: SupabaseClient,
  jobId: string,
  options: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<GradeNotifyResult> {
  const env = options.env ?? process.env;
  const base = env.GRADE_NOTIFY_URL?.trim().replace(/\/+$/, "");
  const secret = env.CRON_SECRET?.trim();
  if (!base || !secret) return "skipped";

  try {
    const { data, error } = await supabase
      .from("grader_scans")
      .select("token")
      .eq("job_id", jobId)
      .maybeSingle();
    const token = (data as { token?: unknown } | null)?.token;
    if (error || typeof token !== "string") return "failed";

    const res = await (options.fetchImpl ?? fetch)(`${base}/api/grade/notify`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    if (!res.ok) {
      console.error(`[worker] grade notify responded ${res.status}`);
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[worker] grade notify failed:", e instanceof Error ? e.message : "unknown error");
    return "failed";
  }
}
