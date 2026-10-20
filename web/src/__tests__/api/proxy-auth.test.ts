import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The proxy is the gate in front of every app page. These cover the session states that
// decide where a visitor lands: none, expired, and valid.

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { proxy } from "@/proxy";

const noSession = { data: { user: null }, error: null };
const expiredSession = {
  data: { user: null },
  error: { name: "AuthApiError", status: 401, message: "JWT expired" },
};
const signedIn = { data: { user: { id: "user-1" } }, error: null };

function target(response: Response): URL | null {
  const location = response.headers.get("location");
  return location ? new URL(location) : null;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  getUser.mockReset();
});

describe("app routes without a valid session", () => {
  it.each([
    ["no session", noSession],
    ["an expired session", expiredSession],
  ])("redirects to login with %s", async (_label, session) => {
    getUser.mockResolvedValue(session);
    for (const path of ["/dashboard", "/projects/p1", "/audits/a1", "/settings", "/personas", "/waitlist"]) {
      const response = await proxy(new NextRequest(`https://personaudit.com${path}`));
      const url = target(response);
      expect(url?.pathname, path).toBe("/auth/login");
      expect(url?.searchParams.get("returnTo"), path).toBe(path);
    }
  });

  it("drops the protected URL's query from login but keeps it in returnTo", async () => {
    getUser.mockResolvedValue(noSession);

    const response = await proxy(new NextRequest("https://personaudit.com/settings?error=agency"));
    const url = target(response)!;

    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("error")).toBeNull();
    expect(url.searchParams.get("returnTo")).toBe("/settings?error=agency");
  });

  it("leaves public pages alone", async () => {
    getUser.mockResolvedValue(noSession);

    for (const path of ["/", "/pricing", "/auth/login"]) {
      const response = await proxy(new NextRequest(`https://personaudit.com${path}`));
      expect(target(response), path).toBeNull();
    }
  });
});

describe("auth routes with a valid session", () => {
  beforeEach(() => getUser.mockResolvedValue(signedIn));

  it("lets a signed-in user through to app routes", async () => {
    const response = await proxy(new NextRequest("https://personaudit.com/dashboard"));
    expect(target(response)).toBeNull();
  });

  it.each(["/auth/login", "/auth/signup"])("sends a signed-in user away from %s", async (path) => {
    const response = await proxy(new NextRequest(`https://personaudit.com${path}`));
    expect(target(response)?.pathname).toBe("/dashboard");
  });

  it.each(["//evil.example", "https://evil.example/x", "/\\evil.example"])(
    "never follows an off-site next=%s",
    async (next) => {
      const response = await proxy(
        new NextRequest(`https://personaudit.com/auth/login?next=${encodeURIComponent(next)}`),
      );
      const url = target(response)!;
      expect(url.origin).toBe("https://personaudit.com");
      expect(url.pathname).toBe("/dashboard");
    },
  );

  it.each(["/auth/update-password", "/auth/callback?code=abc"])(
    "does not bounce %s, which must run with a live session",
    async (path) => {
      const response = await proxy(new NextRequest(`https://personaudit.com${path}`));
      expect(target(response)).toBeNull();
    },
  );
});
