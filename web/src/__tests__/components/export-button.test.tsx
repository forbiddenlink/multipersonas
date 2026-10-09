import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExportButton } from "@/app/(app)/audits/[id]/report/export-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ExportButton", () => {
  it("opens the browser print dialog (the Save-as-PDF path)", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);

    render(<ExportButton />);
    fireEvent.click(screen.getByRole("button", { name: /print.*save as pdf/i }));

    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("downloads verdicts with failed scan coverage evidence and existing columns intact", async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return "blob:csv";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <ExportButton
        filename="verdicts.csv"
        scanCoverage={{
          checks: [{ url: "https://example.com/private?ids=1,2", step: 2, status: "failed", error: 'axe timed out: "retry"' }],
          executionFailures: [{ url: "https://example.com/start", error: "browser closed" }],
        }}
        csvRows={[
          {
            ruleId: "label",
            title: 'Input "email" has no label',
            severity: "serious",
            criteria: ["3.3.2 Labels or Instructions"],
            locations: ["https://example.com/contact"],
            recommendation: "Add a label.",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /download csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const calls = createObjectURL.mock.calls as unknown as [[Blob]];
    const blob = calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error("Expected CSV blob");
    expect(blob.type).toBe("text/csv;charset=utf-8");
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(csv).toContain('"Rule","Title","Severity","WCAG SC","Found at","Recommendation","Scan coverage status","Scan coverage evidence"');
    expect(csv).toContain('"label","Input ""email"" has no label","serious","3.3.2 Labels or Instructions","https://example.com/contact","Add a label.","incomplete"');
    expect(csv).toContain('https://example.com/private?ids=1,2 (step 2): axe timed out: ""retry""');
    expect(csv).toContain("Execution failed at https://example.com/start: browser closed");
    expect(csv.split("\n")).toHaveLength(2);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv");
  });
});


it.each([
  { coverage: null, status: "unknown", evidence: "Scan coverage was not recorded for this run." },
  { coverage: { checks: [{ url: "https://example.com", step: 0, status: "scanned" as const }], executionFailures: [] }, status: "complete", evidence: "1 successful checks, 0 failed checks, 0 execution failures." },
])("exports $status coverage without inventing check results", async ({ coverage, status, evidence }) => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:csv");
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<ExportButton scanCoverage={coverage} csvRows={[{ ruleId: "label", title: "Missing label", severity: "serious", criteria: [], locations: [], recommendation: "Add a label" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
  const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
  if (!blob) throw new Error("Expected CSV blob");
  const csv = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
  expect(csv).toContain(`"${status}"`);
  expect(csv).toContain(evidence);
});
