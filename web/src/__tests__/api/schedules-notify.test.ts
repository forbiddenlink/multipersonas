import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notify = vi.fn();
const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => captureException(...a) }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/scan-notify", () => ({
  notifyFinishedScans: (...args: unknown[]) => notify(...args),
  supabaseNotifyDeps: vi.fn(() => ({})),
}));

describe("/api/schedules/notify", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SCAN_EMAIL_FROM", "Personaudit <scans@personaudit.com>");
    notify.mockResolvedValue({ sent: 1, skipped: 0, failed: 0 });
    POST = (await import("@/app/api/schedules/notify/route")).POST;
  });

  afterEach(() => vi.unstubAllEnvs());

  const request = (secret = "test-cron-secret") =>
    new Request("http://localhost/api/schedules/notify", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });

  it("rejects calls without the cron secret", async () => {
    expect((await POST(request("wrong"))).status).toBe(401);
    expect(notify).not.toHaveBeenCalled();
  });

  it("sends nothing until email is configured", async () => {
    vi.stubEnv("SCAN_EMAIL_FROM", "");
    expect((await POST(request())).status).toBe(503);
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports what it sent", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1, skipped: 0, failed: 0 });
  });

  it("signals failure with 502 when any send failed, so the cron run shows red", async () => {
    notify.mockResolvedValue({ sent: 1, skipped: 0, failed: 2 });
    const res = await POST(request());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ sent: 1, skipped: 0, failed: 2 });
  });

  it("captures an unexpected throw and returns 500", async () => {
    const boom = new Error("db down");
    notify.mockRejectedValue(boom);
    expect((await POST(request())).status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(boom, { tags: { route: "schedules-notify", stage: "run" } });
  });
});
