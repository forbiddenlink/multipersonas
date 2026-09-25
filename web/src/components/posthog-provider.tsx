"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import type { PostHogConfig } from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

// Identifies this app in the shared PostHog project (325061), which several apps
// report into. Registered as a super property so every event carries it and per-app
// funnels stay filterable.
const APP_NAME = "personaudit";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function scrubUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    if (/^\/grade\/[^/]+/.test(url.pathname)) {
      url.pathname = "/grade/[token]";
    }
    return url.toString();
  } catch {
    return raw.split(/[?#]/)[0] ?? raw;
  }
}

function captureCurrentPageview(client: Pick<typeof posthog, "capture">): void {
  const currentUrl = scrubUrl(window.location.href);
  client.capture("$pageview", {
    $current_url: currentUrl,
    $pathname: new URL(currentUrl).pathname,
  }, { send_instantly: true });
}

const posthogOptions = {
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
    // Register before the first capture so the opening pageview carries the app too.
    client.register({ app: APP_NAME });
    captureCurrentPageview(client);
  },
  before_send: (event) => {
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

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, posthogOptions);
}

function PostHogPageview() {
  const pathname = usePathname();
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    captureCurrentPageview(posthog);
  }, [pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider client={posthog}>
      <PostHogPageview />
      {children}
    </Provider>
  );
}
