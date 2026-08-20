import { describe, it, expect } from "vitest";
import { GRADE_JOB_FAILED_MESSAGE, reconcileGradeScan } from "@/lib/grade";

describe("reconcileGradeScan", () => {
  it("leaves a completed scan alone even if the job later failed", () => {
    const scan = { status: "completed", error: null };
    expect(reconcileGradeScan(scan, "failed")).toEqual({
      status: "completed",
      error: null,
      persist: false,
    });
  });

  it("leaves a live scan alone while the job is still queued or running", () => {
    const scan = { status: "running", error: null };
    expect(reconcileGradeScan(scan, "running").persist).toBe(false);
    expect(reconcileGradeScan(scan, "queued").persist).toBe(false);
    expect(reconcileGradeScan(scan, null).persist).toBe(false);
  });

  it("fails a spinning scan when the job has been dead-lettered", () => {
    const scan = { status: "running", error: null };
    expect(reconcileGradeScan(scan, "failed")).toEqual({
      status: "failed",
      error: GRADE_JOB_FAILED_MESSAGE,
      persist: true,
    });
  });

  it("also fails a still-queued scan whose job already failed", () => {
    const scan = { status: "queued", error: null };
    expect(reconcileGradeScan(scan, "failed").status).toBe("failed");
    expect(reconcileGradeScan(scan, "failed").persist).toBe(true);
  });
});
