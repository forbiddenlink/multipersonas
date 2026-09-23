import { beforeEach, describe, it, expect, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * GET /api/audit/[jobId] reads audit_jobs via the service-role client (anon jobs have no
 * client read policy). The row's `result` holds the full audit — target URL + every
 * finding — and is RLS-protected everywhere else. Anonymous jobs (user_id === null) are
 * reachable by capability URL; a job OWNED by a signed-in user must not be served to any
 * bearer of the id, or it becomes a second, unprotected copy of that user's private data.
 *
 * Source-level guard on purpose (mirrors audit-no-private): it fails the moment the
 * ownership check is dropped, rather than waiting for a scenario test to happen to cover it.
 */
describe("audit job poll enforces ownership for signed-in users", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/audit/[jobId]/route.ts"),
    "utf-8",
  );

  it("selects user_id so ownership can be checked", () => {
    expect(source).toMatch(/select\([^)]*user_id/);
  });

  it("resolves the caller's session to compare against the owner", () => {
    expect(source).toMatch(/auth\.getUser\(\)/);
  });

  it("gates owned rows on a matching session (non-null user_id)", () => {
    expect(source).toMatch(/user_id !== null/);
    expect(source).toMatch(/user\.id !== data\.user_id/);
  });
});

const { single, getUser } = vi.hoisted(() => ({ single: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single }) }) }) }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
import { GET } from "@/app/api/audit/[jobId]/route";

describe("audit poll result boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  });

  it.each([null, "owner"])("does not expose retained grader engine scope for owner %s", async (owner) => {
    single.mockResolvedValue({ data: { kind: "grade", status: "completed", user_id: owner, error: null,
      result: { skipped: ["https://public.example/link?private=synthetic"] } }, error: null });
    const response = await GET(new Request("https://personaudit.com/api/audit/job"), { params: Promise.resolve({ jobId: "job" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "completed", result: null, error: null });
  });

  it.each([null, "owner"])("retains existing audit result access for owner %s", async (owner) => {
    single.mockResolvedValue({ data: { kind: "audit", status: "completed", user_id: owner, error: null,
      result: { findings: [] } }, error: null });
    const response = await GET(new Request("https://personaudit.com/api/audit/job"), { params: Promise.resolve({ jobId: "job" }) });
    expect(response.status).toBe(200);
    expect((await response.json()).result).toEqual({ findings: [] });
  });

  it("still hides an owned job from another user", async () => {
    single.mockResolvedValue({ data: { kind: "audit", status: "completed", user_id: "someone-else", error: null,
      result: { findings: [] } }, error: null });
    const response = await GET(new Request("https://personaudit.com/api/audit/job"), { params: Promise.resolve({ jobId: "job" }) });
    expect(response.status).toBe(404);
  });
});
