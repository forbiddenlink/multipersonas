import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { notifyFinishedScans, type NotifyDeps, type ScheduleCandidate } from "./scan-notify";

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
        isFirstScan: false,
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
  });

  it("skips when the owner has no email address", async () => {
    const d = deps({ getOwnerEmail: vi.fn(async () => null) });
    expect(await notifyFinishedScans(d)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(d.send).not.toHaveBeenCalled();
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
