"use client";

import type { PostHog, PostHogConfig } from "posthog-js";
import { carriesShareToken } from "@/lib/sentry-scrub";

// Identifies this app in the shared PostHog project (325061), which several apps
// report into. Registered as a super property so every event carries it and per-app
// funnels stay filterable.
const APP_NAME = "personaudit";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function scrubUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    if (/^\/grade\/[^/]+/.test(url.pathname)) {
      url.pathname = "/grade/[token]";
    }
    // A share link's token is a credential; it must never reach analytics.
    if (/^\/r\/[^/]+/.test(url.pathname)) {
      url.pathname = "/r/[token]";
    }
    return url.toString();
  } catch {
    return raw.split(/[?#]/)[0] ?? raw;
  }
}

export function capturePageview(client: Pick<PostHog, "capture">, currentUrl: string): void {
  client.capture("$pageview", {
    $current_url: currentUrl,
    $pathname: new URL(currentUrl).pathname,
  }, { send_instantly: true });
}

export const posthogOptions = {
  api_host: POSTHOG_HOST,
  // api_host may be the same-origin /ingest proxy. ui_host keeps the toolbar and
  // every "view in PostHog" link pointing at the real app instead of the proxy.
  ui_host: 'https://us.posthog.com',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  advanced_disable_feature_flags: true,
  disable_external_dependency_loading: true,
  disable_session_recording: true,
  disable_surveys: true,
  disable_web_experiments: true,
  mask_all_element_attributes: true,
  mask_all_text: true,
  person_profiles: "identified_only",
  respect_dnt: true,
  loaded: (client) => {
    // Register before the first capture so every event carries the app.
    client.register({ app: APP_NAME });
  },
  before_send: (event) => {
    // A share link token is a credential. Drop any event carrying one in ANY property
    // (current, initial, session entry URLs, person properties), not just known keys.
    if (carriesShareToken(event)) return null;
    if (event?.properties) {
      if (typeof event.properties.$current_url === "string") {
        event.properties.$current_url = scrubUrl(event.properties.$current_url);
      }
      if (typeof event.properties.$referrer === "string") {
        event.properties.$referrer = scrubUrl(event.properties.$referrer);
      }
    }
    return event;
  },
} satisfies Partial<PostHogConfig>;

let client: Promise<PostHog | null> | null = null;
// Set by bounce-beacon when it minted the visitor id for a beacon, so posthog-js adopts it.
let bootstrapDistinctId: string | undefined;
export function setBootstrapDistinctId(id: string): void {
  bootstrapDistinctId = id;
}

/**
 * Load and initialise posthog-js on first use. The SDK is ~45KB gzip and nothing above the
 * fold needs it, so it is imported lazily: callers that queue work through the returned
 * promise are delayed until it is ready, never dropped. Resolves null when no key is set.
 */
export function getPosthog(): Promise<PostHog | null> {
  if (!POSTHOG_KEY || typeof window === "undefined") return Promise.resolve(null);
  // No analytics at all on a share link page: the token is in the URL.
  if (carriesShareToken(window.location.pathname)) return Promise.resolve(null);
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(
      POSTHOG_KEY,
      bootstrapDistinctId
        ? { ...posthogOptions, bootstrap: { distinctID: bootstrapDistinctId } }
        : posthogOptions,
    );
    return posthog;
  });
  return client;
}
