"use client";

import { carriesShareToken } from "@/lib/sentry-scrub";
import { scrubUrl, setBootstrapDistinctId } from "@/lib/posthog-client";

// posthog-js loads after window load plus idle (see idle.ts), so a visitor who leaves
// sooner would send no pageview and vanish from the data. This sends the opening
// pageview with sendBeacon when the page is hidden before the SDK has captured it.
// Both paths go through claimOpeningPageview(), so exactly one of them sends it.

const APP_NAME = "personaudit";
// Same-origin proxy (rewrites in next.config.ts); CSP connect-src already allows 'self'.
const CAPTURE_URL = "/ingest/e/";

let claimed = false;

/** True once per page: whoever gets it sends the opening pageview. */
export function claimOpeningPageview(): boolean {
  if (claimed) return false;
  claimed = true;
  return true;
}

/** Test hook: forget that the opening pageview was claimed. */
export function resetOpeningPageview(): void {
  claimed = false;
}

// Same test posthog-js applies for `respect_dnt: true` (consent.js, _getDnt).
function doNotTrack(): boolean {
  const w = window as unknown as { doNotTrack?: unknown };
  const n = navigator as unknown as { doNotTrack?: unknown; msDoNotTrack?: unknown };
  return [n.doNotTrack, n.msDoNotTrack, w.doNotTrack].some(
    (v) => v === true || v === 1 || v === "1" || v === "yes" || v === "true",
  );
}

// posthog-js keeps its state as JSON under `ph_<token>_posthog`, in localStorage and/or a
// cookie. Reuse its distinct_id when present so a returning visitor stays one person.
function persistedDistinctId(key: string): string | null {
  const name = `ph_${key.replace(/\+/g, "PL").replace(/\//g, "SL").replace(/=/g, "EQ")}_posthog`;
  const parse = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    try {
      const id = (JSON.parse(raw) as { distinct_id?: unknown }).distinct_id;
      return typeof id === "string" && id ? id : null;
    } catch {
      return null;
    }
  };
  try {
    const fromStorage = parse(localStorage.getItem(name));
    if (fromStorage) return fromStorage;
  } catch {
    // storage blocked
  }
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  try {
    return parse(cookie && decodeURIComponent(cookie.slice(name.length + 1)));
  } catch {
    return null;
  }
}

function sendOpeningPageview(key: string, currentUrl: string): void {
  let distinctId = persistedDistinctId(key);
  if (!distinctId) {
    // First visit: nothing to reuse. Mint an id and hand it to posthog-js as its bootstrap
    // id, so the SDK, if it loads later in this same page, continues as the same person.
    distinctId = crypto.randomUUID();
    setBootstrapDistinctId(distinctId);
  }
  const referrer = document.referrer ? scrubUrl(document.referrer) : "";
  const body = JSON.stringify({
    api_key: key,
    event: "$pageview",
    distinct_id: distinctId,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: distinctId,
      $current_url: currentUrl,
      $pathname: new URL(currentUrl).pathname,
      $referrer: referrer || "$direct",
      $lib: "web",
      $process_person_profile: false,
      app: APP_NAME,
    },
  });
  // text/plain keeps this a CORS-simple request; the capture endpoint parses the body itself.
  navigator.sendBeacon(CAPTURE_URL, new Blob([body], { type: "text/plain" }));
}

/**
 * Listen for the page going hidden before the SDK has sent the opening pageview. Returns a
 * cleanup. Does nothing on share-link pages, under Do Not Track, or without a key.
 */
export function armBounceBeacon(): () => void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof navigator.sendBeacon !== "function") return () => {};
  if (carriesShareToken(window.location.pathname)) return () => {};
  if (doNotTrack()) return () => {};
  const currentUrl = scrubUrl(window.location.href);

  const onVisibility = () => {
    if (document.visibilityState === "hidden" && claimOpeningPageview()) {
      sendOpeningPageview(key, currentUrl);
    }
  };
  const onPageHide = () => {
    if (claimOpeningPageview()) sendOpeningPageview(key, currentUrl);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
  };
}
