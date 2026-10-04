import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  projects: [] as { id: string; url: string }[],
  plan: "pro" as "free" | "pro" | "team",
  enqueueError: null as Error | null,
  created: [] as { name: string; url: string }[],
  deleted: [] as string[],
  enqueued: [] as { projectId?: string | null }[],
  released: 0,
  createFails: false,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      select: () => {
        const rows = { data: state.projects, error: null };
        const q: Record<string, unknown> = {
          eq: (_c: string, v: string) => ({
            single: async () => {
              const hit = state.projects.find((p) => p.id === v);
              return { data: hit ? { id: hit.id } : null };
            },
          }),
          then: (f: (r: typeof rows) => unknown) => Promise.resolve(rows).then(f),
        };
        return q;
      },
      delete: () => ({
        eq: async (_c: string, id: string) => {
          state.deleted.push(id);
          return { error: null };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@engine/personas/library", () => {
  const lib = { "first-time-visitor": { id: "first-time-visitor", name: "T", description: "T" } };
  return { personaLibrary: lib, personaDisplayRegistry: lib, isBuiltinPersonaId: () => true };
});
vi.mock("@engine/security/url-guard", () => ({
  assertUrlAllowed: async (u: string) => new URL(u),
  BlockedUrlError: class extends Error {},
}));
vi.mock("@/lib/entitlements", () => ({
  getSessionPlan: async () => state.plan,
  getExactPlan: async () => state.plan,
  planAllowsPersonas: (p: string) => p === "pro" || p === "team",
  projectLimitFor: (p: string) => ({ free: 1, pro: 5, team: null })[p as "free"],
}));
vi.mock("@/lib/limits", () => ({ killSwitchEnabled: () => false, estimatedCallsFor: () => 10 }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: async () => ({ allowed: true, unavailable: false }) }));
vi.mock("@/lib/spend", () => ({
  reserveSpend: async () => true,
  releaseSpend: async () => {
    state.released += 1;
  },
}));
vi.mock("@/lib/client-ip", () => ({ getClientIP: () => "1.1.1.1" }));
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: async () => {} }));
vi.mock("@/lib/audit-jobs", () => ({
  enqueueAuditJob: async (_c: unknown, input: { projectId?: string | null }) => {
    state.enqueued.push(input);
    return state.enqueueError ? { id: null, error: state.enqueueError } : { id: "job-1", error: null };
  },
}));
vi.mock("@/lib/projects", () => ({
  createProject: async (_c: unknown, _u: string, input: { name: string; url: string }) => {
    if (state.createFails) throw new Error("boom");
    state.created.push(input);
    return { id: "new-proj", ...input };
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: () => {} }));

import { POST } from "@/app/api/audit/route";

function call(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  Object.assign(state, {
    projects: [],
    plan: "pro",
    enqueueError: null,
    created: [],
    deleted: [],
    enqueued: [],
    released: 0,
    createFails: false,
  });
});

describe("POST /api/audit with newProject", () => {
  it("creates a project for the site and attaches the job to it", async () => {
    const res = await call({ url: "https://www.acme.test/checkout", newProject: true });
    expect(res.status).toBe(202);
    expect(state.created).toEqual([{ name: "acme.test", url: "https://www.acme.test" }]);
    expect(state.enqueued[0]?.projectId).toBe("new-proj");
  });

  it("attaches to the existing project for that site instead of creating a duplicate", async () => {
    state.projects = [{ id: "p-acme", url: "https://acme.test/" }];
    const res = await call({ url: "https://acme.test/pricing", newProject: true });
    expect(res.status).toBe(202);
    expect(state.created).toEqual([]);
    expect(state.enqueued[0]?.projectId).toBe("p-acme");
  });

  it("refuses with the plan's allowance when the project cap is reached, before any spend", async () => {
    state.projects = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, url: `https://s${i}.test/` }));
    const res = await call({ url: "https://new.test/", newProject: true });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("Your plan includes 5 projects. See pricing to add more.");
    expect(state.created).toEqual([]);
    expect(state.enqueued).toEqual([]);
  });

  it("does not create a project when an explicit projectId is sent", async () => {
    state.projects = [{ id: "p1", url: "https://other.test/" }];
    const res = await call({ url: "https://acme.test/", projectId: "p1", newProject: true });
    expect(res.status).toBe(202);
    expect(state.created).toEqual([]);
    expect(state.enqueued[0]?.projectId).toBe("p1");
  });

  it("removes the project it just created when queueing fails, and refunds spend", async () => {
    state.enqueueError = new Error("rls");
    const res = await call({ url: "https://acme.test/", newProject: true });
    expect(res.status).toBe(500);
    expect(state.deleted).toEqual(["new-proj"]);
    expect(state.released).toBe(1);
  });

  it("refunds spend and fails cleanly when the project cannot be created", async () => {
    state.createFails = true;
    const res = await call({ url: "https://acme.test/", newProject: true });
    expect(res.status).toBe(500);
    expect(state.enqueued).toEqual([]);
    expect(state.released).toBe(1);
  });

  it("still runs without a project when newProject is not requested", async () => {
    const res = await call({ url: "https://acme.test/" });
    expect(res.status).toBe(202);
    expect(state.created).toEqual([]);
    expect(state.enqueued[0]?.projectId).toBeNull();
  });
});
