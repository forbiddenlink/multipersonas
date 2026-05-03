import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase — authenticated by default
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user", email: "test@example.com" } },
      }),
    },
  }),
}));

// Mock the engine persona library
vi.mock("@engine/personas/library", () => ({
  personaLibrary: {
    "first-time-visitor": { id: "first-time-visitor", name: "First-Time Visitor" },
    "screen-reader-user": { id: "screen-reader-user", name: "Screen Reader User" },
  },
  personasByCategory: {
    accessibility: ["screen-reader-user"],
    general: ["first-time-visitor"],
  },
}));

describe("GET /api/personas", () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/personas/route");
    GET = mod.GET;
  });

  it("returns personas and categories for authenticated user", async () => {
    const req = new Request("http://localhost/api/personas");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.personas).toBeDefined();
    expect(data.categories).toBeDefined();
    expect(Array.isArray(data.personas)).toBe(true);
    expect(typeof data.categories).toBe("object");
  });

  it("rejects unauthenticated requests", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      }),
    }));
    vi.resetModules();
    const mod = await import("@/app/api/personas/route");

    const res = await mod.GET();
    expect(res.status).toBe(401);
  });
});
