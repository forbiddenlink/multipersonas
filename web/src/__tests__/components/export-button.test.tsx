import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExportButton } from "@/app/(app)/audits/[id]/report/export-button";

afterEach(cleanup);

describe("ExportButton", () => {
  it("opens the browser print dialog (the Save-as-PDF path)", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);

    render(<ExportButton />);
    fireEvent.click(screen.getByRole("button", { name: /print.*save as pdf/i }));

    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
