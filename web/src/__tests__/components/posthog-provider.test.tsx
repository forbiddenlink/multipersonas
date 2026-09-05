import { afterEach, expect, it, vi } from "vitest";

const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { init } }));
vi.mock("posthog-js/react", () => ({ PostHogProvider: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); init.mockClear(); });

it("removes URL fragments and queries before analytics events leave the browser", async () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "synthetic-test-key");
  await import("@/components/posthog-provider");
  const options = init.mock.calls[0]![1];
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
