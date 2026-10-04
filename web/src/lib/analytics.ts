"use client";

import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function safeAnalyticsHost(rawUrl: string): string | undefined {
  try {
    return new URL(rawUrl).host.toLowerCase();
  } catch {
    return undefined;
  }
}

export function trackProductEvent(event: string, properties: AnalyticsProperties = {}): void {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;

  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );

  try {
    posthog.capture(event, safeProperties, { send_instantly: true });
  } catch {
    // Analytics must never block the product path.
  }
}

const IDENTIFIED_KEY = "pa_identified_user";

/**
 * Join anonymous grade activity to the signed-in account. Id only: no email or name
 * ever goes to PostHog. Runs once per browser session per user.
 */
export function identifyUser(userId: string, personProperties: AnalyticsProperties = {}): void {
  if (typeof window === "undefined" || !POSTHOG_KEY || !userId) return;

  try {
    if (window.sessionStorage.getItem(IDENTIFIED_KEY) === userId) return;
  } catch {
    // Storage can be blocked; identify is idempotent for the same id, so carry on.
  }

  const safeProperties = Object.fromEntries(
    Object.entries(personProperties).filter(([, value]) => value !== undefined),
  );

  try {
    posthog.identify(userId, safeProperties);
    try {
      window.sessionStorage.setItem(IDENTIFIED_KEY, userId);
    } catch {
      // Best effort.
    }
  } catch {
    // Analytics must never block the product path.
  }
}

/** Drop the identified person on sign-out so the next visitor on this browser is anonymous. */
export function resetAnalyticsIdentity(): void {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;

  try {
    window.sessionStorage.removeItem(IDENTIFIED_KEY);
  } catch {
    // Best effort.
  }

  try {
    posthog.reset();
  } catch {
    // Analytics must never block the product path.
  }
}

/** Coarse, PII-free bucket for a failed grade. The raw error text can contain URLs. */
export function gradeFailureReason(error: string | null | undefined): string {
  const text = (error ?? "").toLowerCase();
  if (!text) return "unknown";
  if (/timed? ?out|timeout|deadline/.test(text)) return "timeout";
  if (/enotfound|econnrefused|unreachable|dns|could not (reach|resolve)|net::|ssl|certificate/.test(text)) {
    return "unreachable";
  }
  return "scan_error";
}
