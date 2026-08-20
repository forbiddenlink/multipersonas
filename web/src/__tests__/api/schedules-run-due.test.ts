import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("POST /api/schedules/run-due", () => {
  let POST: (req: Request) => Promise<Response>;
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mockRpc.mockResolvedValue({ data: [{ schedule_id: "schedule-1", job_id: "job-1" }], error: null });
    const mod = await import("@/app/api/schedules/run-due/route");
    POST = mod.POST;
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  function request(secret = "test-cron-secret") {
    return new Request("http://localhost/api/schedules/run-due", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
  }

  it("rejects calls without the cron bearer secret", async () => {
    const res = await POST(request("wrong"));
    expect(res.status).toBe(401);
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
    });
  });
});
