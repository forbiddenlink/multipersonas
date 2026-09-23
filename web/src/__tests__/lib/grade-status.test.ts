import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGraderScan, gradeLetterFromReport, gradeStatusFromJob } from "@/lib/grade";

describe("gradeStatusFromJob", () => {
  it("uses audit_jobs as the lifecycle source when a grade job exists", () => {
    expect(gradeStatusFromJob({ scanStatus: "queued", jobStatus: "running" })).toBe("running");
    expect(gradeStatusFromJob({ scanStatus: "running", jobStatus: "completed" })).toBe("completed");
    expect(gradeStatusFromJob({ scanStatus: "completed", jobStatus: "failed" })).toBe("failed");
  });

  it("falls back to the scan row only for legacy token rows without a job", () => {
    expect(gradeStatusFromJob({ scanStatus: "completed", jobStatus: null })).toBe("completed");
  });
});

describe("gradeLetterFromReport", () => {
  it("reads a letter from a stored grade report and ignores junk", () => {
    expect(gradeLetterFromReport({ grade: "B", score: 87 })).toBe("B");
    expect(gradeLetterFromReport(null)).toBe(null);
    expect(gradeLetterFromReport("B")).toBe(null);
    expect(gradeLetterFromReport({ grade: 87 })).toBe(null);
  });
});


const { maybeSingle, eq } = vi.hoisted(() => ({ maybeSingle: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq }) }) }),
}));

describe("getGraderScan lifecycle reads", () => {
  const scan = { token: "synthetic-token", job_id: "synthetic-job", status: "completed", error: null, report: { grade: "A" } };
  beforeEach(() => {
    vi.resetAllMocks();
    eq.mockReturnValue({ maybeSingle });
  });

  it("keeps the job authoritative even when the scan result is already saved", async () => {
    maybeSingle.mockResolvedValueOnce({ data: scan, error: null })
      .mockResolvedValueOnce({ data: { status: "running", error: null }, error: null });
    expect((await getGraderScan(scan.token))?.status).toBe("running");
    expect(eq).toHaveBeenNthCalledWith(1, "token", scan.token);
    expect(eq).toHaveBeenNthCalledWith(2, "id", scan.job_id);
  });

  it("does not use stale completion when the linked job read fails", async () => {
    maybeSingle.mockResolvedValueOnce({ data: scan, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "private database detail" } });
    await expect(getGraderScan(scan.token)).rejects.toThrow("Could not load scan status.");
  });

  it("distinguishes a failed scan read from an unknown token", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "private database detail" } });
    await expect(getGraderScan(scan.token)).rejects.toThrow("Could not load scan result.");
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(getGraderScan(scan.token)).resolves.toBeNull();
  });

  it("retains the saved terminal state after the job reference has been removed", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { ...scan, job_id: null }, error: null });
    expect((await getGraderScan(scan.token))?.status).toBe("completed");
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("returns failure from the queue instead of a previously stored successful report status", async () => {
    maybeSingle.mockResolvedValueOnce({ data: scan, error: null })
      .mockResolvedValueOnce({ data: { status: "failed", error: "The scan failed." }, error: null });
    expect(await getGraderScan(scan.token)).toMatchObject({ status: "failed", error: "The scan failed." });
  });
});
