import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { GradeReport } from "@engine/grader/score";
import { GradeMethodDisclosure } from "@/components/dossier/grade-method";

afterEach(cleanup);

function report(over: Partial<GradeReport> = {}): GradeReport {
  return {
    grade: "A",
    score: 98,
    pagesScanned: 2,
    totalViolations: 0,
    byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    wcagAAViolations: 0,
    perPage: [
      { url: "a", score: 100, violations: 0 },
      { url: "b", score: 96, violations: 1 },
    ],
    rules: [],
    ...over,
  };
}

describe("GradeMethodDisclosure severity cap", () => {
  it("states the cap rule on every grade", () => {
    render(<GradeMethodDisclosure report={report()} />);
    expect(screen.getByText(/critical holds the letter at C or below/)).toBeInTheDocument();
    expect(screen.queryByText(/This grade is held at/)).not.toBeInTheDocument();
  });

  it("explains a capped letter in place of leaving the arithmetic unexplained", () => {
    render(<GradeMethodDisclosure report={report({ grade: "C", cappedBy: { impact: "critical", maxGrade: "C" } })} />);
    expect(screen.getByText(/This grade is held at C because at least one critical WCAG A\/AA failure/)).toBeInTheDocument();
  });
});
