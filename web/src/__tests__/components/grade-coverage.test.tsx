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
