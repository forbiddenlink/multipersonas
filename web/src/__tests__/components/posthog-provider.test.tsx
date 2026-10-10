import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { init, capture } = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { init, capture } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  init.mockClear();
  capture.mockClear();
});

async function loadedOptions() {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "synthetic-test-key");
  const { getPosthog } = await import("@/lib/posthog-client");
  await getPosthog();
  return init.mock.calls[0]![1];
}

it("removes URL fragments and queries before analytics events leave the browser", async () => {
  const options = await loadedOptions();
  const event = options.before_send({ properties: {
    $current_url: "https://example.com/auth/callback?code=synthetic#access_token=synthetic",
    $referrer: "https://synthetic-user:synthetic-password@example.com/grade/private-token#private-fragment",
  } });
  expect(event.properties).toEqual({
    $current_url: "https://example.com/auth/callback",
    $referrer: "https://example.com/grade/[token]",
  });
  expect(options.before_send({ properties: { $referrer: "/relative#private-fragment" } }).properties.$referrer)
    .toBe("/relative");
});

it("tags every event with the app so the shared posthog project stays filterable", async () => {
  const options = await loadedOptions();
  const client = { register: vi.fn() };

  options.loaded(client);

  expect(client.register).toHaveBeenCalledWith({ app: "personaudit" });
});

it("loads posthog-js once and never when no key is configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  const unconfigured = await import("@/lib/posthog-client");
  expect(await unconfigured.getPosthog()).toBeNull();
  expect(init).not.toHaveBeenCalled();

  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "synthetic-test-key");
  const configured = await import("@/lib/posthog-client");
  await Promise.all([configured.getPosthog(), configured.getPosthog()]);
  expect(init).toHaveBeenCalledTimes(1);
});

it("sends the opening pageview after load without a scrubbed URL leaking its query", async () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "synthetic-test-key");
  window.history.replaceState(null, "", "/?utm=secret#frag");
  const { PostHogProvider } = await import("@/components/posthog-provider");

  render(<PostHogProvider>{null}</PostHogProvider>);
  // Not part of first paint: the SDK is not loaded synchronously with the render.
  expect(init).not.toHaveBeenCalled();

  await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
  expect(init).toHaveBeenCalledTimes(1);
  const [name, props] = capture.mock.calls[0]!;
  expect(name).toBe("$pageview");
  expect(props.$current_url).not.toMatch(/utm|frag/);
  window.history.replaceState(null, "", "/");
});
