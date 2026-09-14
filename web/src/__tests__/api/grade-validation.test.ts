import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/grade/route";

const { rpc, countQuery, consumeRateLimit, getUser, update, updateEq, updateIs } = vi.hoisted(() => {
  const updateIs = vi.fn(async () => ({ error: null }));
  const updateEq = vi.fn(() => ({ is: updateIs }));
  const update = vi.fn(() => ({ eq: updateEq }));
  return {
    rpc: vi.fn(),
    countQuery: vi.fn(),
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null } }> => ({
      data: { user: null },
    })),
    update,
    updateEq,
    updateIs,
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({
      select: () => ({ eq: () => ({ eq: countQuery }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: { token: "non-atomic-token" }, error: null }) }) }),
      update,
    }),
  }),
}));
vi.mock("@engine/security/url-guard", () => ({
  assertUrlAllowed: async () => new URL("https://example.invalid/"),
  BlockedUrlError: class extends Error {},
}));
vi.mock("@/lib/client-ip", () => ({ getClientIP: () => "unknown" }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => ({ ok: true }) }));
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: async () => {} }));

describe("POST /api/grade — validation", () => {
  it("rejects a null JSON body without throwing", async () => {
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST",
      body: "null",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON body" });
  });
});

describe("POST /api/grade — atomic queue admission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    countQuery.mockResolvedValue({ count: 0, error: null });
    rpc.mockResolvedValue({ data: [{ job_id: "job-1", token: "scan-1", status: "queued" }], error: null });
    updateIs.mockResolvedValue({ error: null });
  });

  it("returns the token created by the atomic enqueue transaction", async () => {
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST", body: JSON.stringify({ url: "https://example.invalid" }),
    }));
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1" });
    expect(rpc).toHaveBeenCalledWith("enqueue_grade_scan", {
      p_url: "https://example.invalid/", p_queue_cap: 25,
      p_rate_key: "grade:unknown", p_rate_max: 5, p_rate_window_seconds: 600,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("attaches the scan to a signed-in account without waiting for claim", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST", body: JSON.stringify({ url: "https://example.invalid" }),
    }));
    expect(response.status).toBe(202);
    expect(update).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(updateEq).toHaveBeenCalledWith("token", "scan-1");
    expect(updateIs).toHaveBeenCalledWith("user_id", null);
  });
});

describe("POST /api/grade — transactional rate limit", () => {
  it.each([
    ["busy", "The grader is busy. Please try again shortly.", "60"],
    ["rate_limited", "Free grade limit reached. Please wait and try again.", "600"],
  ])("returns the existing response for %s", async (status, error, retry) => {
    countQuery.mockResolvedValue({ count: 0, error: null });
    rpc.mockResolvedValue({ data: [{ status, job_id: null, token: null }], error: null });
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST", body: JSON.stringify({ url: "https://example.invalid" }),
    }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error });
    expect(response.headers.get("Retry-After")).toBe(retry);
  });

  it("fails closed when atomic admission is unavailable", async () => {
    countQuery.mockResolvedValue({ count: 0, error: null });
    rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST", body: JSON.stringify({ url: "https://example.invalid" }),
    }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not queue the grade." });
  });
});
