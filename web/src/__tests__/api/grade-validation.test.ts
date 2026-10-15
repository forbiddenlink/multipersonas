import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it.each(["auth", "claim"])("returns the queued token even if optional %s fails", async (failure) => {
    if (failure === "auth") getUser.mockRejectedValueOnce(new Error("Auth unavailable"));
    else {
      getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
      updateIs.mockRejectedValueOnce(new Error("Claim unavailable"));
    }
    const response = await POST(new Request("http://localhost/api/grade", {
      method: "POST", body: JSON.stringify({ url: "https://example.invalid" }),
    }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1" });
    expect(rpc).toHaveBeenCalledTimes(1);
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

describe("POST /api/grade: optional email capture", () => {
  const post = (body: Record<string, unknown>) =>
    POST(new Request("http://localhost/api/grade", { method: "POST", body: JSON.stringify({ url: "https://example.invalid", ...body }) }));
  const emailCalls = () => rpc.mock.calls.filter(([fn]) => fn === "request_grade_email");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SCAN_EMAIL_FROM", "Personaudit <grades@personaudit.com>");
    getUser.mockResolvedValue({ data: { user: null } });
    rpc.mockImplementation(async (fn: string) =>
      fn === "enqueue_grade_scan"
        ? { data: [{ job_id: "job-1", token: "scan-1", status: "queued" }], error: null }
        : { data: "saved", error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("needs no email: the free grade queues exactly as before", async () => {
    const response = await post({});
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1" });
    expect(emailCalls()).toHaveLength(0);
  });

  it("treats a blank field as no email", async () => {
    const response = await post({ email: "   " });
    expect(await response.json()).toEqual({ token: "scan-1" });
    expect(emailCalls()).toHaveLength(0);
  });

  it("rejects a malformed address before queueing or spending any quota", async () => {
    const response = await post({ email: "not-an-address" });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stores the address against the new token, after the grade is queued", async () => {
    const response = await post({ email: "Visitor@Example.com" });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1", emailStatus: "saved" });
    expect(rpc.mock.calls[0]![0]).toBe("enqueue_grade_scan");
    expect(emailCalls()).toHaveLength(1);
    expect(emailCalls()[0]![1]).toMatchObject({ p_token: "scan-1", p_email: "visitor@example.com" });
  });

  it("never puts the address in the enqueue call or the response", async () => {
    const response = await post({ email: "visitor@example.com" });
    const enqueue = rpc.mock.calls.find(([fn]) => fn === "enqueue_grade_scan")!;
    expect(JSON.stringify(enqueue)).not.toContain("visitor");
    expect(JSON.stringify(await response.json())).not.toContain("visitor");
  });

  it("still queues the grade when the email cannot be stored", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "enqueue_grade_scan"
        ? { data: [{ job_id: "job-1", token: "scan-1", status: "queued" }], error: null }
        : { data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    const response = await post({ email: "visitor@example.com" });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1", emailStatus: "unavailable" });
  });

  it("reports a cap hit but still queues the grade", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "enqueue_grade_scan"
        ? { data: [{ job_id: "job-1", token: "scan-1", status: "queued" }], error: null }
        : { data: "rate_limited", error: null });
    const response = await post({ email: "visitor@example.com" });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ token: "scan-1", emailStatus: "rate_limited" });
  });

  it("ignores the email when mail is not configured (fail closed)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const response = await post({ email: "visitor@example.com" });
    expect(await response.json()).toEqual({ token: "scan-1", emailStatus: "unavailable" });
    expect(emailCalls()).toHaveLength(0);
  });

  it("does not store an address when the queue is busy (no grade exists to email about)", async () => {
    rpc.mockImplementation(async () => ({ data: [{ status: "busy", job_id: null, token: null }], error: null }));
    const response = await post({ email: "visitor@example.com" });
    expect(response.status).toBe(429);
    expect(emailCalls()).toHaveLength(0);
  });
});
