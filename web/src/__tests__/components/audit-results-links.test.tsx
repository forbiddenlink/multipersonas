import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AuditResults, type AuditResponse } from "@/components/audit-results";

afterEach(cleanup);

const base: AuditResponse = {
  url: "https://example.com",
  taskSuccess: { achieved: 1, total: 1 },
  personas: [],
  axeFindings: [],
  conflicts: [],
};

describe("AuditResults saved-run links", () => {
  it("links to the saved run and its report when the run id is known", () => {
    render(<AuditResults results={{ ...base, runId: "run-123" }} onReset={() => {}} compact />);
    expect(screen.getByRole("link", { name: "Open the full run" })).toHaveAttribute("href", "/audits/run-123");
    expect(screen.getByRole("link", { name: "Open the report" })).toHaveAttribute("href", "/audits/run-123/report");
  });

  it("shows no run links for results without a saved run (anonymous or older jobs)", () => {
    render(<AuditResults results={base} onReset={() => {}} compact />);
    expect(screen.queryByRole("link", { name: "Open the full run" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open the report" })).not.toBeInTheDocument();
  });
});
