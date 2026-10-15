import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { notifyGradeFinished } from "./grade-notify.js";

const TOKEN = "11111111-1111-4111-8111-111111111111";

function client(row: { token?: string } | null, error: { message: string } | null = null) {
  const eq = vi.fn(() => ({ maybeSingle: async () => ({ data: row, error }) }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq };
}

const env = { GRADE_NOTIFY_URL: "https://personaudit.com/", CRON_SECRET: "s3cret" };

describe("notifyGradeFinished", () => {
  it("does nothing, and makes no request, unless both env vars are set", async () => {
    const fetchImpl = vi.fn();
    const { client: db, from } = client({ token: TOKEN });
    expect(await notifyGradeFinished(db, "job-1", { env: {}, fetchImpl })).toBe("skipped");
    expect(await notifyGradeFinished(db, "job-1", { env: { CRON_SECRET: "x" }, fetchImpl })).toBe("skipped");
    expect(await notifyGradeFinished(db, "job-1", { env: { GRADE_NOTIFY_URL: "https://x" }, fetchImpl })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("posts only the grade token, with the bearer secret, to the notify endpoint", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const { client: db, eq } = client({ token: TOKEN });
    expect(await notifyGradeFinished(db, "job-1", { env, fetchImpl: fetchImpl as unknown as typeof fetch })).toBe("sent");
    expect(eq).toHaveBeenCalledWith("job_id", "job-1");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://personaudit.com/api/grade/notify");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer s3cret");
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN });
  });

  it("never throws: a network error, a bad status or a missing row is reported as failed", async () => {
    const { client: db } = client({ token: TOKEN });
    const boom = vi.fn(async () => { throw new Error("offline"); });
    expect(await notifyGradeFinished(db, "j", { env, fetchImpl: boom as unknown as typeof fetch })).toBe("failed");
    const bad = vi.fn(async () => new Response("no", { status: 502 }));
    expect(await notifyGradeFinished(db, "j", { env, fetchImpl: bad as unknown as typeof fetch })).toBe("failed");
    const none = client(null);
    const ok = vi.fn();
    expect(await notifyGradeFinished(none.client, "j", { env, fetchImpl: ok as unknown as typeof fetch })).toBe("failed");
    expect(ok).not.toHaveBeenCalled();
  });
});
