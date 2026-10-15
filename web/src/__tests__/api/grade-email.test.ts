import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, verifyTurnstile, sendEmail, captureMessage } = vi.hoisted(() => ({
  rpc: vi.fn(),
  verifyTurnstile: vi.fn(async () => ({ ok: true })),
  sendEmail: vi.fn<(message: { to: string; idempotencyKey: string }) => Promise<{ ok: true } | { ok: false; error: string }>>(async () => ({ ok: true })),
  captureMessage: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage, captureException: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/client-ip", () => ({ getClientIP: () => "203.0.113.7" }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile }));
vi.mock("@/lib/grade", () => ({
  isGradeToken: (t: unknown) => typeof t === "string" && /^[0-9a-f-]{36}$/i.test(t),
  getGraderScan: vi.fn(async () => ({
    entry_url: "https://example.com/",
    status: "completed",
    report: { grade: "B" },
  })),
  gradeLetterFromReport: (r: { grade?: string } | null) => r?.grade ?? null,
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => Boolean(process.env.RESEND_API_KEY && process.env.SCAN_EMAIL_FROM),
  sendEmail,
}));

import { GET, POST } from "@/app/api/grade/email/route";

const TOKEN = "11111111-1111-4111-8111-111111111111";
const ADDRESS = "visitor@example.com";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/grade/email", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("SCAN_EMAIL_FROM", "Personaudit <grades@personaudit.com>");
  verifyTurnstile.mockResolvedValue({ ok: true });
  rpc.mockImplementation(async (fn: string) => {
    if (fn === "request_grade_email") return { data: "saved", error: null };
    if (fn === "claim_grade_email") return { data: ADDRESS, error: null };
    return { data: null, error: null };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/grade/email (is the field offered?)", () => {
  it("is enabled when mail is configured and the migration is applied", async () => {
    expect(await (await GET()).json()).toEqual({ enabled: true });
  });

  it("fails closed when the mail provider is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await (await GET()).json()).toEqual({ enabled: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the sender address is not configured", async () => {
    vi.stubEnv("SCAN_EMAIL_FROM", "");
    expect(await (await GET()).json()).toEqual({ enabled: false });
  });

  it("fails closed before the migration is applied (deploy order)", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    expect(await (await GET()).json()).toEqual({ enabled: false });
  });

  it("fails closed under the kill switch", async () => {
    vi.stubEnv("AUDIT_KILL_SWITCH", "1");
    expect(await (await GET()).json()).toEqual({ enabled: false });
  });
});

describe("POST /api/grade/email", () => {
  it("rejects a malformed token or address before touching the database", async () => {
    expect((await post({ token: "nope", email: ADDRESS })).status).toBe(400);
    expect((await post({ token: TOKEN, email: "not an email" })).status).toBe(400);
    expect((await post({ token: TOKEN })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects non-object bodies", async () => {
    expect((await POST(new Request("http://localhost/x", { method: "POST", body: "null" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost/x", { method: "POST", body: "[]" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost/x", { method: "POST", body: "{" }))).status).toBe(400);
  });

  it("is unavailable, not erroring, when mail is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await post({ token: TOKEN, email: ADDRESS })).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires the human check before any database work", async () => {
    verifyTurnstile.mockResolvedValueOnce({ ok: false });
    expect((await post({ token: TOKEN, email: ADDRESS })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stores the address with the caller and recipient caps, and normalises it", async () => {
    const res = await post({ token: TOKEN, email: "  Visitor@Example.com " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "saved" });
    const call = rpc.mock.calls.find(([fn]) => fn === "request_grade_email")!;
    expect(call[1]).toMatchObject({
      p_token: TOKEN,
      p_email: ADDRESS,
      p_ip_key: "gradeemail:ip:203.0.113.7",
      p_ip_max: 5,
      p_to_max: 3,
      p_window_seconds: 86400,
    });
  });

  it("answers 429 with Retry-After when a cap is hit, and does not send", async () => {
    rpc.mockResolvedValueOnce({ data: "rate_limited", error: null });
    const res = await post({ token: TOKEN, email: ADDRESS });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("maps an unknown grade to 404 and an old one to 410", async () => {
    rpc.mockResolvedValueOnce({ data: "not_found", error: null });
    expect((await post({ token: TOKEN, email: ADDRESS })).status).toBe(404);
    rpc.mockResolvedValueOnce({ data: "expired", error: null });
    expect((await post({ token: TOKEN, email: ADDRESS })).status).toBe(410);
  });

  it("is unavailable before the migration is applied", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "42883", message: "function does not exist" } });
    expect((await post({ token: TOKEN, email: ADDRESS })).status).toBe(503);
  });

  it("a repeat request for the same grade succeeds without sending again", async () => {
    rpc.mockResolvedValueOnce({ data: "exists", error: null });
    const res = await post({ token: TOKEN, email: ADDRESS });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "exists" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends immediately if the grade had already finished, once", async () => {
    await post({ token: TOKEN, email: ADDRESS });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0]![0]).toMatchObject({ to: ADDRESS, idempotencyKey: `grade-email-${TOKEN}` });
  });

  it("does not echo or report the address anywhere it should not", async () => {
    const res = await post({ token: TOKEN, email: ADDRESS });
    expect(JSON.stringify(await res.json())).not.toContain("visitor");
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain("visitor");
    expect(JSON.stringify(verifyTurnstile.mock.calls)).not.toContain("visitor");
  });
});
