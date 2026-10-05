import "server-only";

/**
 * Transactional email through the Resend REST API. Off unless both RESEND_API_KEY
 * and SCAN_EMAIL_FROM are set, so a deployment without them never sends anything
 * (same fail-closed shape as checkout and the cron runner).
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.SCAN_EMAIL_FROM?.trim());
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Resend dedupes retries that carry the same key for 24 hours. */
  idempotencyKey: string;
}

export async function sendEmail(message: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SCAN_EMAIL_FROM?.trim();
  if (!key || !from) return { ok: false, error: "Email is not configured." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "idempotency-key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Resend responded ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email request failed" };
  }
}
