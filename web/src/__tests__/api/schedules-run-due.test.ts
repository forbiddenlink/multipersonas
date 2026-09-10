import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("POST /api/schedules/run-due", () => {
  let POST: (req: Request) => Promise<Response>;
  let GET: (req: Request) => Promise<Response>;
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mockRpc.mockResolvedValue({ data: [{ schedule_id: "schedule-1", job_id: "job-1" }], error: null });
    const mod = await import("@/app/api/schedules/run-due/route");
    POST = mod.POST;
    GET = mod.GET;
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    vi.unstubAllEnvs();
  });

  function request(secret = "test-cron-secret", method = "POST") {
    return new Request("http://localhost/api/schedules/run-due", {
      method,
      headers: { authorization: `Bearer ${secret}` },
    });
  }

  it("rejects calls without the cron bearer secret", async () => {
    const res = await POST(request("wrong"));
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("honors the emergency kill switch before queueing scans", async () => {
    vi.stubEnv("AUDIT_KILL_SWITCH", "1");
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("enqueues due schedules through the service-only RPC", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enqueued: 1,
      jobs: [{ schedule_id: "schedule-1", job_id: "job-1" }],
    });
    expect(mockRpc).toHaveBeenCalledWith("enqueue_due_project_scan_schedules", {
      p_limit: 25,
      p_daily_cap: 5000,
      p_caller_cap: 250,
      p_calls_per_persona: 25,
    });
  });

  it("accepts Vercel's authenticated GET cron invocation", async () => {
    const res = await GET(request("test-cron-secret", "GET"));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("enqueue_due_project_scan_schedules", {
      p_limit: 25,
      p_daily_cap: 5000,
      p_caller_cap: 250,
      p_calls_per_persona: 25,
    });
  });
});

describe("scheduled scan SQL", () => {
  it("routes scheduled jobs through the shared audit enqueue RPC", async () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260821153936_audit_job_enqueue_boundary.sql"),
      "utf8",
    );
    expect(sql).toMatch(/create or replace function public\.enqueue_audit_job/);
    expect(sql).toMatch(/public\.enqueue_audit_job\(/);
  });
});
