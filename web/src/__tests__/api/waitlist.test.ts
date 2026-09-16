import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service-only write boundary. `insert` is reassigned per-test via `mockInsert`.
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn(() => ({ insert: mockInsert })),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({ insert: mockInsert })),
  }),
}));

const mockConsumeRateLimit = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
const mockVerifyTurnstile = vi.fn().mockResolvedValue({ configured: false, ok: true });

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: (...args: unknown[]) => mockVerifyTurnstile(...args),
}));

describe("POST /api/waitlist", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockConsumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mockVerifyTurnstile.mockResolvedValue({ configured: false, ok: true });
    const mod = await import("@/app/api/waitlist/route");
    POST = mod.POST;
  });

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects an invalid email with 400 without burning rate-limit quota", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockVerifyTurnstile).not.toHaveBeenCalled();
    expect(mockConsumeRateLimit).not.toHaveBeenCalled();
  });

  it("inserts a lowercased, trimmed email and returns ok on a valid payload", async () => {
    const res = await POST(
      makeRequest({
        email: "  Foo@Example.COM  ",
        sitesCount: "6-20",
        note: "hi",
        attribution: { source: "google", campaign: "fall-launch" },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(mockVerifyTurnstile).toHaveBeenCalledWith(undefined, "unknown");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(createAdminClient).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith({
      email: "foo@example.com",
      source: "for-agencies:google",
      sites_count: "6-20",
      note: "hi",
    });
  });

  it("rejects a failed Turnstile check before rate-limit or insert", async () => {
    mockVerifyTurnstile.mockResolvedValue({ configured: true, ok: false });

    const res = await POST(makeRequest({ email: "a@example.com", turnstileToken: "bad" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Verification failed. Please refresh the page and try again.");
    expect(mockConsumeRateLimit).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns ok+already on a unique-violation (23505)", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const res = await POST(makeRequest({ email: "dupe@example.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, already: true });
  });

  it("rejects a sitesCount value outside the enum with 400", async () => {
    const res = await POST(makeRequest({ email: "a@example.com", sitesCount: "100+" }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a note longer than 500 characters with 400", async () => {
    const res = await POST(makeRequest({ email: "a@example.com", note: "x".repeat(501) }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects malformed attribution without burning rate-limit quota", async () => {
    const res = await POST(
      makeRequest({ email: "a@example.com", attribution: { source: "not allowed!" } }),
    );
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockConsumeRateLimit).not.toHaveBeenCalled();
  });

  it("returns 500 on an unexpected DB error without leaking details", async () => {
    mockInsert.mockResolvedValue({ error: { code: "XX000", message: "connection reset" } });
    const res = await POST(makeRequest({ email: "a@example.com" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Could not join the waitlist. Please try again.");
    expect(JSON.stringify(data)).not.toContain("connection reset");
  });
});
