import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { armBounceBeacon, claimOpeningPageview, resetOpeningPageview } from "./bounce-beacon";

const KEY = "phc_testkey";

let sendBeacon: ReturnType<typeof vi.fn>;
let disarm: () => void;

function setPath(path: string): void {
  window.history.replaceState({}, "", path);
}

function setVisibility(state: "hidden" | "visible"): void {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

async function sentBody(i = 0): Promise<Record<string, unknown>> {
  const blob = sendBeacon.mock.calls[i]?.[1] as Blob;
  return JSON.parse(await blob.text());
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", KEY);
  sendBeacon = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
  Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
  localStorage.clear();
  resetOpeningPageview();
  setPath("/");
});

afterEach(() => {
  disarm?.();
  vi.unstubAllEnvs();
  setVisibility("visible");
});

describe("bounce beacon", () => {
  it("sends one pageview to the same-origin proxy when hidden before the SDK captured it", async () => {
    disarm = armBounceBeacon();
    setVisibility("hidden");
    setVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0]?.[0]).toBe("/ingest/e/");
    const body = await sentBody();
    expect(body).toMatchObject({ api_key: KEY, event: "$pageview" });
    expect(body.properties).toMatchObject({ app: "personaudit", $pathname: "/" });
    expect(typeof body.distinct_id).toBe("string");
  });

  it("sends nothing when the SDK already captured the opening pageview", () => {
    disarm = armBounceBeacon();
    expect(claimOpeningPageview()).toBe(true); // the SDK path
    setVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("leaves the opening pageview to the SDK path once the beacon sent it", () => {
    disarm = armBounceBeacon();
    setVisibility("hidden");
    expect(claimOpeningPageview()).toBe(false);
  });

  it("sends nothing on a share-link page", () => {
    setPath("/r/abc123secrettoken");
    disarm = armBounceBeacon();
    setVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("sends nothing under Do Not Track", () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    disarm = armBounceBeacon();
    setVisibility("hidden");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("sends nothing without a PostHog key", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    disarm = armBounceBeacon();
    setVisibility("hidden");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("scrubs the URL: no query, hash, or grade token", async () => {
    setPath("/grade/secret-grade-token?email=a@b.co#frag");
    disarm = armBounceBeacon();
    setVisibility("hidden");
    const text = JSON.stringify(await sentBody());
    expect(text).toContain("/grade/[token]");
    expect(text).not.toContain("secret-grade-token");
    expect(text).not.toContain("email=");
    expect(text).not.toContain("frag");
  });

  it("reuses the distinct_id posthog-js persisted", async () => {
    localStorage.setItem(`ph_${KEY}_posthog`, JSON.stringify({ distinct_id: "existing-id" }));
    disarm = armBounceBeacon();
    setVisibility("hidden");
    expect((await sentBody()).distinct_id).toBe("existing-id");
  });
});
