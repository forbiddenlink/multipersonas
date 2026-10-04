import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, verifyOtp } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession, verifyOtp } })),
}));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  vi.resetAllMocks();
  exchangeCodeForSession.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ data: {}, error: null });
});

function callback(next: string, code = "synthetic-code"): Request {
  const url = new URL("https://personaudit.com/auth/callback");
  url.searchParams.set("next", next);
  if (code) url.searchParams.set("code", code);
  return new Request(url);
}

describe("auth callback destinations", () => {
  const checkout = "/for-agencies?checkout=ready#early-access";

  it("returns a successful sign-in to checkout", async () => {
    const response = await GET(callback(checkout));
    expect(response.headers.get("location")).toBe(`https://personaudit.com${checkout}`);
  });

  it.each(["rejected", "missing", "network"])("preserves checkout intent after a %s code", async (failure) => {
    if (failure === "rejected") exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    if (failure === "network") exchangeCodeForSession.mockRejectedValue(new Error("private provider detail"));
    const response = await GET(callback(checkout, failure === "missing" ? "" : "synthetic-code"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("error")).toBe("auth");
    expect(location.searchParams.get("returnTo")).toBe(checkout);
    expect(location.toString()).not.toContain("private provider detail");
  });

  it("does not resume an expired password recovery session after ordinary login", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    const response = await GET(callback("/auth/update-password"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("error")).toBe("reset_expired");
    expect(location.searchParams.has("returnTo")).toBe(false);
  });

  it("does not preserve an external destination on failure", async () => {
    const response = await GET(callback("//evil.example", ""));
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://personaudit.com");
    expect(location.searchParams.get("returnTo")).toBe("/dashboard");
  });
});

// Email links point at personaudit.com with a token hash (not at the Supabase domain),
// so mail clients see one consistent domain. The callback verifies the hash itself.
function emailLink(next: string, type: string, tokenHash = "synthetic-hash"): Request {
  const url = new URL("https://personaudit.com/auth/callback");
  url.searchParams.set("next", next);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return new Request(url);
}

describe("auth callback email token links", () => {
  it("verifies a recovery token and lands on the update-password page", async () => {
    const response = await GET(emailLink("/auth/update-password", "recovery"));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "synthetic-hash", type: "recovery" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://personaudit.com/auth/update-password");
  });

  it("verifies a signup confirmation and keeps the intended destination", async () => {
    const response = await GET(emailLink("/projects?url=https%3A%2F%2Facme.test", "signup"));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "synthetic-hash", type: "signup" });
    expect(response.headers.get("location")).toBe("https://personaudit.com/projects?url=https%3A%2F%2Facme.test");
  });

  it("shows the expired-reset message when a recovery token is used or stale", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: "expired" } });
    const response = await GET(emailLink("/auth/update-password", "recovery"));
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("reset_expired");
  });

  it("refuses an unknown token type without calling the auth server", async () => {
    const response = await GET(emailLink("/dashboard", "sms"));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth");
  });
});
