import { describe, expect, it } from "vitest";
import {
  FINDING_STATUSES,
  isFindingStatus,
  resolvedAtForStatus,
} from "./finding-workflow";

describe("finding workflow", () => {
  it("accepts every persisted finding status", () => {
    for (const status of FINDING_STATUSES) {
      expect(isFindingStatus(status)).toBe(true);
    }
    expect(isFindingStatus("done")).toBe(false);
  });

  it("marks only terminal statuses as resolved", () => {
    expect(resolvedAtForStatus("open")).toBeNull();
    expect(resolvedAtForStatus("assigned")).toBeNull();
    expect(resolvedAtForStatus("fixed")).toEqual(expect.any(String));
    expect(resolvedAtForStatus("accepted-risk")).toEqual(expect.any(String));
    expect(resolvedAtForStatus("false-positive")).toEqual(expect.any(String));
  });
});
