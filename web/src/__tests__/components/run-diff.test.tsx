import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RunDiff } from "@/components/run-diff";
import type { RunRegression } from "@/lib/baseline";

afterEach(cleanup);

const firstRun: RunRegression = {
  current: {
    id: "r1",
    url: "https://example.com",
    created_at: "2026-10-01T00:00:00Z",
    task_success_achieved: 1,
    task_success_total: 1,
    persona_ids: [],
  },
  previous: null,
  newDefects: [],
  cleared: [],
  unchangedCount: 0,
  identityPartial: false,
};

describe("RunDiff first-run copy", () => {
  it("points at the Retest action when the viewer can retest", () => {
    render(<RunDiff diff={firstRun} canRetest />);
    expect(screen.getByText(/Press Retest to run this site again/)).toBeInTheDocument();
    expect(screen.queryByText(/Run another scan/)).not.toBeInTheDocument();
  });

  it("does not name a Retest action the viewer does not have", () => {
    render(<RunDiff diff={firstRun} />);
    expect(screen.queryByText(/Press Retest/)).not.toBeInTheDocument();
  });
});
