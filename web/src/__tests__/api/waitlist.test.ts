import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client. `insert` is reassigned per-test via `mockInsert`.
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({ insert: mockInsert })),
  }),
}));

describe("POST /api/waitlist", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
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

  it("rejects an invalid email with 400", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts a lowercased, trimmed email and returns ok on a valid payload", async () => {
    const res = await POST(
      makeRequest({ email: "  Foo@Example.COM  ", sitesCount: "6-20", note: "hi" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith({
      email: "foo@example.com",
      sites_count: "6-20",
      note: "hi",
    });
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

  it("returns 500 on an unexpected DB error without leaking details", async () => {
    mockInsert.mockResolvedValue({ error: { code: "XX000", message: "connection reset" } });
    const res = await POST(makeRequest({ email: "a@example.com" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Could not join the waitlist. Please try again.");
    expect(JSON.stringify(data)).not.toContain("connection reset");
  });
});
