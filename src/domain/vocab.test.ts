import { describe, expect, it } from "vitest";
import {
  AUDIT_JOB_STATUSES,
  FINDING_CATEGORIES,
  FINDING_STATUSES,
  SEVERITIES,
  clampFindingCategory,
  clampSeverity,
  isAuditJobStatus,
  isFindingStatus,
  isSeverity,
  severityAtLeast,
} from "./vocab.js";

describe("domain vocabularies", () => {
  it("owns the shared finding severity/category/status lists", () => {
    expect(SEVERITIES).toEqual(["critical", "serious", "moderate", "minor"]);
    expect(FINDING_CATEGORIES).toEqual(["accessibility", "usability", "performance", "content"]);
    expect(FINDING_STATUSES).toEqual(["open", "assigned", "fixed", "accepted-risk", "false-positive"]);
    expect(AUDIT_JOB_STATUSES).toEqual(["queued", "running", "completed", "failed"]);
  });

  it("clamps untrusted persisted strings at the domain boundary", () => {
    expect(clampSeverity("serious")).toBe("serious");
    expect(clampSeverity("surprising")).toBe("moderate");
    expect(clampFindingCategory("performance")).toBe("performance");
    expect(clampFindingCategory("mystery")).toBe("usability");
  });

  it("exposes guards and threshold comparison from one owner", () => {
    expect(isSeverity("critical")).toBe(true);
    expect(isFindingStatus("fixed")).toBe(true);
    expect(isAuditJobStatus("queued")).toBe(true);
    expect(severityAtLeast("serious", "moderate")).toBe(true);
    expect(severityAtLeast("minor", "serious")).toBe(false);
  });
});
