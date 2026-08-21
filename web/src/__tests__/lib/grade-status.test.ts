import { describe, expect, it } from "vitest";
import { gradeStatusFromJob } from "@/lib/grade";

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
