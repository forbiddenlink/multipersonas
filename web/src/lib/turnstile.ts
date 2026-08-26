import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  /** Whether a secret is configured. When false, verification was skipped. */
  configured: boolean;
  /** True if the caller may proceed (verified, or skipped because unconfigured). */
  ok: boolean;
}

/**
 * Verify a Cloudflare Turnstile token server-side, guarding the public grader against
 * scripted abuse that a per-IP rate limit can't stop (a botnet mints fresh IPs).
 *
 * Env-gated, enforce-only-when-configured — same shape as AUDIT_REQUIRE_EGRESS_PROXY:
 * - TURNSTILE_SECRET_KEY unset (local/preview) -> skip, return { ok:true }. Dev unblocked;
 *   shipping this code changes nothing in an environment that hasn't provisioned keys.
 * - Secret set + token valid -> { ok:true }.
 * - Secret set + token missing/invalid -> { ok:false } (deny).
 * - Secret set + Cloudflare/network error -> { ok:false } (FAIL CLOSED). This is an abuse
 *   gate on a public compute surface, not the availability rate limit (which fails open),
 *   so a rare CF blip briefly denying is the safe trade over an open door. The per-IP
 *   limit, queue cap, and kill switch remain as backstops.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string,
  secret = process.env.TURNSTILE_SECRET_KEY,
): Promise<TurnstileResult> {
  if (!secret || secret.trim() === "") {
    return { configured: false, ok: true };
  }
  if (!token || typeof token !== "string") {
    return { configured: true, ok: false };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      // A slow (not down) siteverify must not hang the request. Abort -> catch -> fail closed,
      // same safe deny as a network error; the whole point is a bounded abuse gate.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { configured: true, ok: false };
    const data = (await res.json()) as { success?: boolean };
    return { configured: true, ok: data.success === true };
  } catch {
    return { configured: true, ok: false };
  }
}
