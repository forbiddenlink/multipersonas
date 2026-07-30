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
  it("allows unauthenticated requests (rate limited to 1/hour)", async () => {
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

    // Clear module cache to pick up new mock
    vi.resetModules();
    const mod = await import("@/app/api/audit/route");

    const req = new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const res = await mod.POST(req);
    // Should not be 401 — anonymous audits are allowed
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/audit — projectId", () => {
  async function loadRouteWithMocks(opts: {
    user: { id: string; email: string } | null;
    projectRow?: { id: string } | null;
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
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: opts.projectRow ?? null,
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
      user: { id: "test-user", email: "test@example.com" },
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

  it("ignores a projectId supplied by an anonymous caller instead of rejecting", async () => {
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
    // Anonymous callers can't own a project, so the field is dropped rather than
    // rejected with the ownership error above.
    expect(res.status).toBe(202);
  });
});
