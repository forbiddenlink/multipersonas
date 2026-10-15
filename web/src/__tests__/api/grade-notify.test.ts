import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, sendEmail } = vi.hoisted(() => ({
  rpc: vi.fn(),
  sendEmail: vi.fn<(message: { subject: string }) => Promise<{ ok: true } | { ok: false; error: string }>>(async () => ({ ok: true })),
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/grade", () => ({
  isGradeToken: (t: unknown) => typeof t === "string" && /^[0-9a-f-]{36}$/i.test(t),
  getGraderScan: vi.fn(async () => ({ entry_url: "https://example.com/", status: "failed", report: null })),
  gradeLetterFromReport: () => null,
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => Boolean(process.env.RESEND_API_KEY && process.env.SCAN_EMAIL_FROM),
  sendEmail,
}));

import { GET, POST } from "@/app/api/grade/notify/route";

const TOKEN = "11111111-1111-4111-8111-111111111111";

const call = (method: "GET" | "POST", secret: string | null, body?: unknown) =>
  (method === "GET" ? GET : POST)(
    new Request("http://localhost/api/grade/notify", {
      method,
      headers: secret ? { authorization: `Bearer ${secret}` } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("SCAN_EMAIL_FROM", "Personaudit <grades@personaudit.com>");
  rpc.mockImplementation(async (fn: string) => {
    if (fn === "claim_grade_email") return { data: "visitor@example.com", error: null };
    if (fn === "pending_grade_email_tokens") return { data: [{ token: TOKEN }], error: null };
    return { data: null, error: null };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("/api/grade/notify", () => {
  it("rejects callers without the shared secret", async () => {
    expect((await call("POST", null, { token: TOKEN })).status).toBe(401);
    expect((await call("POST", "wrong", { token: TOKEN })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is unavailable when the secret or the mail provider is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("POST", "cron-secret", { token: TOKEN })).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await call("POST", "cron-secret", { token: TOKEN })).status).toBe(503);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends the email for the named grade and says so", async () => {
    const res = await call("POST", "cron-secret", { token: TOKEN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0]![0].subject).toBe("We could not finish grading example.com");
  });

  it("reports skipped when nobody asked for an email", async () => {
    rpc.mockImplementation(async () => ({ data: null, error: null }));
    const res = await call("POST", "cron-secret", { token: TOKEN });
    expect(await res.json()).toEqual({ outcome: "skipped" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a malformed token", async () => {
    expect((await call("POST", "cron-secret", { token: "nope" })).status).toBe(400);
  });

  it("signals a failed send with 502 so the worker log shows it", async () => {
    sendEmail.mockResolvedValueOnce({ ok: false, error: "Resend responded 500" });
    expect((await call("POST", "cron-secret", { token: TOKEN })).status).toBe(502);
  });

  it("sweeps every pending grade when no token is given (cron)", async () => {
    const res = await call("GET", "cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(rpc.mock.calls.map(([fn]) => fn)).toContain("prune_grade_email_requests");
  });

  it("does nothing, quietly, before the migration is applied", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    const res = await call("GET", "cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 0, skipped: 0, failed: 0 });
  });
});
