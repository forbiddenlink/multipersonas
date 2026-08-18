import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user", email: "test@example.com" } },
      }),
    },
  }),
}));

// Mock the engine imports to avoid loading Playwright
vi.mock("@engine/personas/library", () => ({
  personaLibrary: {
    "first-time-visitor": { id: "first-time-visitor", name: "Test" },
    "keyboard-traversal": { id: "keyboard-traversal", name: "Test" },
    "mobile-slow-connection": { id: "mobile-slow-connection", name: "Test" },
  },
}));

vi.mock("@engine/agent/orchestrator", () => ({
  runMultiPersonaTest: vi.fn(),
}));

describe("POST /api/audit — validation", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("@/app/api/audit/route");
    POST = mod.POST;
  });

  it("rejects missing body", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("rejects missing URL", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Please enter a URL to audit");
  });

  it("rejects invalid URL format", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-url" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("https://");
  });

  it("rejects FTP protocol", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "ftp://example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks localhost (SSRF)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://localhost:8080" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("private network");
  });

  it("blocks 10.x.x.x (SSRF)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://10.0.0.1/admin" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("private network");
  });

  it("blocks 192.168.x.x (SSRF)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://192.168.1.1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks 169.254.x.x metadata endpoint (SSRF)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data/" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks 127.x.x.x (SSRF)", async () => {
    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://127.0.0.1:3000" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/audit — anonymous access", () => {
  it("gates unauthenticated requests behind the Pro paywall (personas are paid)", async () => {
    // Re-mock with no user
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      }),
    }));
    vi.doMock("@engine/security/url-guard", () => ({
      assertUrlAllowed: vi.fn().mockResolvedValue(new URL("https://example.com/")),
      BlockedUrlError: class BlockedUrlError extends Error {},
    }));

    // Clear module cache to pick up new mocks
    vi.resetModules();
    const mod = await import("@/app/api/audit/route");

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const res = await mod.POST(req);
    // Anonymous callers resolve to the free plan and are gated at 402 (Payment Required),
    // not 401 (Unauthorized) — the block is about plan, not authentication.
    expect(res.status).toBe(402);
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/audit — projectId", () => {
  async function loadRouteWithMocks(opts: {
    user: { id: string; email: string } | null;
    projectRow?: { id: string } | null;
    plan?: string;
  }) {
    vi.doMock("@engine/security/url-guard", () => ({
      assertUrlAllowed: vi.fn().mockResolvedValue(new URL("https://example.com/")),
      BlockedUrlError: class BlockedUrlError extends Error {},
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
    }));
    vi.doMock("@/lib/spend", () => ({
      reserveSpend: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/limits", () => ({
      killSwitchEnabled: vi.fn().mockReturnValue(false),
      estimatedCallsFor: vi.fn((n: number) => n * 25),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: vi.fn().mockReturnValue({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "job-1" }, error: null }),
            })),
          })),
        })),
      }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
        },
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                // The route reads profiles.plan (entitlement gate) and projects.id
                // (ownership) through the same client; return the right row per table.
                data:
                  table === "profiles"
                    ? { plan: opts.plan ?? "free" }
                    : (opts.projectRow ?? null),
                error: null,
              }),
            })),
          })),
        })),
      }),
    }));
    vi.resetModules();
    return import("@/app/api/audit/route");
  }

  it("rejects a projectId not owned by the caller", async () => {
    const mod = await loadRouteWithMocks({
      // Pro plan so the caller clears the persona gate and reaches the ownership check.
      user: { id: "test-user", email: "test@example.com" },
      plan: "pro",
      projectRow: null,
    });

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", projectId: "not-mine" }),
    });
    const res = await mod.POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Project not found");
  });

  it("gates an anonymous caller behind the Pro paywall (personas are paid)", async () => {
    const mod = await loadRouteWithMocks({ user: null });

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        projectId: "someone-elses-project",
      }),
    });
    const res = await mod.POST(req);
    // Anonymous callers resolve to the free plan, which cannot run the persona audit —
    // the gate returns 402 before any project/rate/spend logic is reached.
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.upgrade).toBe(true);
    expect(data.freeAlternative).toBe("/grade");
  });
});
