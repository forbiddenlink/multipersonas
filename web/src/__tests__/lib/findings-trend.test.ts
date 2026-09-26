import { describe, expect, it } from "vitest";
import { buildFindingsTrend } from "@/lib/findings-trend";

const runs = [
  { id: "r3", created_at: "2026-09-20T10:00:00Z" },
  { id: "r1", created_at: "2026-09-01T10:00:00Z" },
  { id: "r2", created_at: "2026-09-10T10:00:00Z" },
];

describe("buildFindingsTrend", () => {
  it("orders runs oldest first and counts axe findings per run by severity", () => {
    const trend = buildFindingsTrend(runs, [
      { test_run_id: "r1", severity: "critical" },
      { test_run_id: "r1", severity: "critical" },
      { test_run_id: "r1", severity: "serious" },
      { test_run_id: "r2", severity: "critical" },
      { test_run_id: "r3", severity: "minor" },
    ]);

    expect(trend.map((row) => row.runId)).toEqual(["r1", "r2", "r3"]);
    expect(trend[0]?.counts).toEqual({ critical: 2, serious: 1, moderate: 0, minor: 0 });
    expect(trend.map((row) => row.total)).toEqual([3, 1, 1]);
  });

  it("reports the change against the previous run, and none for the first", () => {
    const trend = buildFindingsTrend(runs, [
      { test_run_id: "r1", severity: "critical" },
      { test_run_id: "r2", severity: "critical" },
      { test_run_id: "r2", severity: "moderate" },
    ]);

    expect(trend.map((row) => row.change)).toEqual([null, 1, -2]);
  });

  it("counts an unknown severity as minor rather than dropping it", () => {
    const [row] = buildFindingsTrend(
      [{ id: "r1", created_at: "2026-09-01T10:00:00Z" }],
      [{ test_run_id: "r1", severity: "bogus" }],
    );
    expect(row?.counts.minor).toBe(1);
    expect(row?.total).toBe(1);
  });

  it("returns an empty trend when there are no runs", () => {
    expect(buildFindingsTrend([], [{ test_run_id: "x", severity: "critical" }])).toEqual([]);
  });
});
