import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { FindingsTrend } from "@/components/findings-trend";
import { buildFindingsTrend } from "@/lib/findings-trend";

afterEach(cleanup);

const rows = buildFindingsTrend(
  [
    { id: "a", created_at: "2026-09-01T10:00:00Z" },
    { id: "b", created_at: "2026-09-10T10:00:00Z" },
    { id: "c", created_at: "2026-09-20T10:00:00Z" },
  ],
  [
    { test_run_id: "a", severity: "critical" },
    { test_run_id: "a", severity: "serious" },
    { test_run_id: "b", severity: "critical" },
    { test_run_id: "b", severity: "minor" },
    { test_run_id: "b", severity: "minor" },
  ],
);

describe("FindingsTrend", () => {
  it("renders a keyboard-focusable table region with one row per run", () => {
    render(<FindingsTrend rows={rows} />);
    const region = screen.getByRole("region", { name: "Findings over time table" });
    expect(region.getAttribute("tabindex")).toBe("0");
    // header row + 3 runs
    expect(within(region).getAllByRole("row")).toHaveLength(4);
  });

  it("announces the change against the previous run as text", () => {
    render(<FindingsTrend rows={rows} />);
    expect(screen.getByText("first run, no earlier run to compare")).toBeTruthy();
    expect(screen.getByText("1 more than the previous run")).toBeTruthy();
    expect(screen.getByText("3 fewer than the previous run")).toBeTruthy();
  });
});
