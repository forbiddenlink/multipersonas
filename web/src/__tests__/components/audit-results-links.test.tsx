import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportIssueCopyAll } from "@/app/(app)/audits/[id]/report-issue-copy-all";
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


it("shows failed URLs and execution reasons on fresh results", () => {
  render(<AuditResults results={{ ...base, scanCoverage: { checks: [{ url: "https://example.com/private", step: 2, status: "failed", error: "axe timed out" }], executionFailures: [{ url: "https://example.com/start", error: "browser closed" }] } }} onReset={() => {}} />);
  expect(screen.getByText(/Scan coverage incomplete/)).toBeInTheDocument();
  expect(screen.getByText(/https:\/\/example.com\/private.*axe timed out/)).toBeInTheDocument();
  expect(screen.getByText(/https:\/\/example.com\/start.*browser closed/)).toBeInTheDocument();
});

it("keeps legacy coverage unknown", () => {
  render(<AuditResults results={base} onReset={() => {}} />);
  expect(screen.getByText("Scan coverage was not recorded for this run.")).toBeInTheDocument();
});


it("allows copying failed coverage when there are no open violations", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<ReportIssueCopyAll findings={[]} scanCoverage={{ checks: [{ url: "https://example.com/private", step: 0, status: "failed", error: "axe timed out" }], executionFailures: [] }} />);
  const button = screen.getByRole("button", { name: "Copy coverage report" });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("https://example.com/private (step 0): axe timed out")));
});
