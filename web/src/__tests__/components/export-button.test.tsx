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

  it("downloads a CSV of report verdicts", () => {
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
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv");
  });
});
