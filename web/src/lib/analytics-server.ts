import "server-only";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const DEFAULT_HOST = "https://us.i.posthog.com";

function captureHost(): string {
  const configured = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  // A relative value is the same-origin /ingest proxy, which only exists in the browser.
  return configured && /^https?:\/\//.test(configured) ? configured.replace(/\/$/, "") : DEFAULT_HOST;
}

/**
 * Capture a product event from the server, where the browser cannot know the step
 * happened (a redirecting server action, an OAuth callback). distinct_id is the Supabase
 * user id, the same id the client identifies with, so server and client events join.
 * Never pass emails, names, or URLs carrying tokens in `properties`.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, string | number | boolean | null | undefined> = {},
): Promise<void> {
  if (!POSTHOG_KEY || !distinctId) return;

  try {
    await fetch(`${captureHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { app: "personaudit", ...properties },
      }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Analytics must never block the product path.
  }
}
