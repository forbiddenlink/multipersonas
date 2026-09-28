import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieMethodsServer }) => ({
    auth: {
      getUser: async () => {
        await options.cookies.setAll?.([
          { name: "session-test", value: "refreshed", options: { path: "/", httpOnly: true, sameSite: "lax" } },
        ], { "Cache-Control": "private, no-store", "Pragma": "no-cache", "Expires": "0" });
        return getUser();
      },
    },
  }),
}));

import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-key");
  getUser.mockResolvedValue({ data: { user: { id: "test-user" } } });
});
afterEach(() => vi.unstubAllEnvs());

describe("session refresh responses", () => {
  it.each([
    ["/auth/login?returnTo=%2Fprojects", true, "/projects"],
    ["/projects?view=all", false, "/auth/login?returnTo=%2Fprojects%3Fview%3Dall"],
    ["/dashboard", true, null],
  ])("preserves refreshed cookies and cache protection on %s", async (path, signedIn, destination) => {
    getUser.mockResolvedValue({ data: { user: signedIn ? { id: "test-user" } : null } });
    const response = await proxy(new NextRequest(`https://personaudit.com${path}`));
    expect(response.cookies.get("session-test")).toMatchObject({ value: "refreshed", httpOnly: true, sameSite: "lax", path: "/" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("location")).toBe(destination ? `https://personaudit.com${destination}` : null);
  });
});
