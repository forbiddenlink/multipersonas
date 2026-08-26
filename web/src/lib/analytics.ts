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
