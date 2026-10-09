import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RunDiff } from "@/components/run-diff";
import type { RunRegression } from "@/lib/baseline";

afterEach(cleanup);

const firstRun: RunRegression = {
  comparisonComplete: true, comparisonNotes: [],
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


it("labels missing coverage instead of showing a fixed count or no-change claim", () => {
  render(<RunDiff diff={{ ...firstRun, previous: firstRun.current, comparisonComplete: false, comparisonNotes: ["Previous finding location was not checked: https://example.com/private"] }} />);
  expect(screen.getByText(/Comparison incomplete/)).toBeInTheDocument();
  expect(screen.getByText("Not verified")).toBeInTheDocument();
  expect(screen.getByText(/https:\/\/example.com\/private/)).toBeInTheDocument();
  expect(screen.queryByText(/No new or fixed/)).not.toBeInTheDocument();
});
