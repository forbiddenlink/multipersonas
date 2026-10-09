import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));

import { notifyFinishedScans, supabaseNotifyDeps, type NotifyDeps, type ScheduleCandidate } from "./scan-notify";

const candidate: ScheduleCandidate = {
  id: "s1",
  projectId: "p1",
  userId: "u1",
  lastJobId: "j2",
  lastNotifiedJobId: "j1",
};

function deps(overrides: Partial<NotifyDeps> = {}): NotifyDeps {
  return {
    origin: "https://personaudit.com",
    listCandidates: vi.fn(async () => [candidate]),
    getJob: vi.fn(async () => ({ status: "completed", runId: "r2" })),
    claim: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    getProject: vi.fn(async () => ({ name: "Acme", url: "https://acme.example" })),
    getOwnerEmail: vi.fn(async () => "owner@acme.example"),
    getRunSummary: vi.fn(async () => ({
      regression: {
        comparisonComplete: true, isFirstScan: false,
        newDefects: [{ title: "Images must have alternate text", severity: "critical" as const, pageUrl: "https://acme.example/" }],
        cleared: [],
        unchangedCount: 2,
      },
      taskSuccess: null,
    })),
    send: vi.fn(async () => ({ ok: true as const })),
    ...overrides,
  };
}

describe("notifyFinishedScans", () => {
  it("emails the owner once per finished scheduled job, linking the run", async () => {
    const d = deps();
    const result = await notifyFinishedScans(d);
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(d.claim).toHaveBeenCalledWith(candidate);
    const msg = vi.mocked(d.send).mock.calls[0]![0];
    expect(msg.to).toBe("owner@acme.example");
    expect(msg.subject).toBe("Acme: 1 new issue");
    expect(msg.text).toContain("https://personaudit.com/audits/r2");
    expect(msg.idempotencyKey).toBe("scan-result-s1-j2");
  });

  it("waits while the job is still queued or running, without claiming it", async () => {
    for (const status of ["queued", "running"]) {
      const d = deps({ getJob: vi.fn(async () => ({ status, runId: null })) });
      expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
      expect(d.claim).not.toHaveBeenCalled();
      expect(d.send).not.toHaveBeenCalled();
    }
  });

  it("sends nothing when another caller already claimed the job", async () => {
    const d = deps({ claim: vi.fn(async () => false) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(d.send).not.toHaveBeenCalled();
  });

  it("releases the claim when the send fails so the next run retries", async () => {
    const d = deps({ send: vi.fn(async () => ({ ok: false as const, error: "Resend responded 500" })) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect(d.release).toHaveBeenCalledWith(candidate);
  });

  it("tells the owner when a scheduled scan failed", async () => {
    const d = deps({ getJob: vi.fn(async () => ({ status: "failed", runId: null })) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(d.getRunSummary).not.toHaveBeenCalled();
    expect(vi.mocked(d.send).mock.calls[0]![0].subject).toBe("Acme: scheduled scan did not finish");
  });

  it("skips a completed job whose saved run cannot be found instead of guessing", async () => {
    const d = deps({ getRunSummary: vi.fn(async () => null) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(d.send).not.toHaveBeenCalled();
    expect(d.release).toHaveBeenCalledWith(candidate);
  });

  it("skips when the owner has no email address", async () => {
    const d = deps({ getOwnerEmail: vi.fn(async () => null) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(d.send).not.toHaveBeenCalled();
    expect(d.release).toHaveBeenCalledWith(candidate);
  });

  it("retries a claimed job after temporarily missing project data", async () => {
    let notified = false;
    const d = deps({
      listCandidates: async () => notified ? [] : [candidate],
      claim: async () => { notified = true; return true; },
      release: async () => { notified = false; },
      getProject: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ name: "Acme", url: "https://acme.example" }),
    });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(d.send).toHaveBeenCalledOnce();
  });

  it("keeps going after one schedule throws and stops at the per-run cap", async () => {
    const many = Array.from({ length: 4 }, (_, i) => ({ ...candidate, id: `s${i}`, lastJobId: `j${i}` }));
    const getProject = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue({ name: "Acme", url: "https://acme.example" });
    const d = deps({ listCandidates: vi.fn(async () => many), getProject });
    expect(await notifyFinishedScans(d, { maxSends: 2 })).toEqual({ sent: 2, skipped: 0, failed: 1 });
    expect(d.release).toHaveBeenCalledWith(many[0]);
  });
});

it("finds pending notifications beyond a page of already-notified schedules", async () => {
  const rows = Array.from({ length: 201 }, (_, i) => ({
    id: `schedule-${i}`, project_id: "p1", user_id: "u1",
    last_job_id: `job-${i}`, last_notified_job_id: i < 200 ? `job-${i}` : null,
  }));
  const client = createClient<Database>("https://synthetic.example", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "scan-notify-pagination-test" },
    global: { fetch: async (input) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 200);
      return Response.json(rows.slice(offset, offset + limit));
    } },
  });
  const d = supabaseNotifyDeps(client, "https://personaudit.com", async () => ({ ok: true }));
  expect((await d.listCandidates()).map((item) => item.id)).toEqual(["schedule-200"]);
});

it.each(["release", "getProject", "getOwnerEmail", "getJob"] as const)("reports failed %s data access", async (operation) => {
  const client = createClient<Database>("https://synthetic.example", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `scan-notify-${operation}-test` },
    global: { fetch: async () => Response.json({ message: "synthetic database failure" }, { status: 400 }) },
  });
  const d = supabaseNotifyDeps(client, "https://personaudit.com", async () => ({ ok: true }));
  await expect(operation === "release" ? d.release(candidate) : d[operation]("00000000-0000-4000-8000-000000000001"))
    .rejects.toThrow("synthetic database failure");
});


it("emails an incomplete comparison when the current run failed to scan a previous defect's page", async () => {
  const client = createClient<Database>("https://synthetic.example", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "scan-notify-incomplete-test" },
    global: { fetch: async (input) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.pathname.endsWith("/test_runs")) return Response.json([
        { id: "r2", url: "https://acme.example", created_at: "2026-10-09T00:00:00Z", task_success_achieved: 0, task_success_total: 1, persona_ids: [], scan_coverage: { checks: [{ url: "https://acme.example/private", step: 0, status: "failed", error: "axe timed out" }], executionFailures: [] } },
        { id: "r1", url: "https://acme.example", created_at: "2026-10-08T00:00:00Z", task_success_achieved: 1, task_success_total: 1, persona_ids: [], scan_coverage: null },
      ]);
      if (url.pathname.endsWith("/findings")) return Response.json(url.searchParams.get("test_run_id") === "eq.r1" ? [
        { id: "f1", title: "Missing label", severity: "serious", rule_id: "label", target: "#email", page_url: "https://acme.example/private", description: "Missing label" },
      ] : []);
      throw new Error("Unexpected synthetic request");
    } },
  });
  const backed = supabaseNotifyDeps(client, "https://personaudit.com", async () => ({ ok: true }));
  const d = deps({ getRunSummary: backed.getRunSummary });
  expect(await notifyFinishedScans(d)).toEqual({ sent: 1, skipped: 0, failed: 0 });
  const email = vi.mocked(d.send).mock.calls[0]![0];
  expect(email.subject).toContain("comparison incomplete");
  expect(email.text).toContain("https://acme.example/private (step 0): axe timed out");
  expect(`${email.subject} ${email.text} ${email.html}`).not.toMatch(/\d+ fixed|Fixed since|no change since/i);
});
