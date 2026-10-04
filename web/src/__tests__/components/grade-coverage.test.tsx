import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GradeCoverage } from "@/components/grade-coverage";
import { computeGrade } from "@engine/grader/score";

afterEach(cleanup);
it("shows skipped scope separately from the evaluated page count", () => {
  render(<GradeCoverage report={{ ...computeGrade([]), pagesScanned: 2, coverage: { pageLimit: 10, skippedPages: 3 } }} />);
  expect(screen.getByText(/2 pages evaluated/)).toHaveTextContent("3 discovered URLs were not evaluated");
  expect(screen.getByText(/only evaluated public pages/)).toBeInTheDocument();
});
it("does not invent complete coverage for older reports", () => {
  render(<GradeCoverage report={computeGrade([])} />);
  expect(screen.getByText(/older report does not include/)).toBeInTheDocument();
});
it("uses singular copy for a one-page grade with nothing skipped", () => {
  render(<GradeCoverage report={{ ...computeGrade([]), pagesScanned: 1, coverage: { pageLimit: 10, skippedPages: 0 } }} />);
  expect(screen.getByText(/1 page evaluated with a 10-page limit\./)).not.toHaveTextContent("discovered URL");
});

import { GradeCoverageNote } from "@/components/grade-coverage";

it("says up front that the grade is automated checks only and a person checks the rest", () => {
  render(<GradeCoverageNote needsReview={undefined} />);
  expect(screen.getByText(/automated checks only/i)).toBeInTheDocument();
  expect(screen.getByText(/a person has to check the rest/i)).toBeInTheDocument();
});
it("cites the Deque study with a link, not a bare number", () => {
  render(<GradeCoverageNote needsReview={undefined} />);
  expect(screen.getByText(/find about 57% of issues by volume/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Deque, 2021 study/ })).toHaveAttribute(
    "href",
    "https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/",
  );
});
it("surfaces the needs-human-check count when the report recorded one", () => {
  render(<GradeCoverageNote needsReview={7} />);
  expect(screen.getByText(/7 elements need a human check/)).toBeInTheDocument();
});
it("uses singular copy for one element", () => {
  render(<GradeCoverageNote needsReview={1} />);
  expect(screen.getByText(/1 element needs a human check/)).toBeInTheDocument();
});
it("omits the count for zero and for older reports that never recorded it", () => {
  const { rerender } = render(<GradeCoverageNote needsReview={0} />);
  expect(screen.queryByText(/human check/)).not.toBeInTheDocument();
  rerender(<GradeCoverageNote needsReview={undefined} />);
  expect(screen.queryByText(/human check/)).not.toBeInTheDocument();
});
