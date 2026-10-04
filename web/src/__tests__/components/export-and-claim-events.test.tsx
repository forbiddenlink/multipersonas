import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "@/app/(app)/audits/[id]/report/export-button";
import { ClaimGrades } from "@/components/claim-grades";
import { trackProductEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/grade-tokens", () => ({
  readRememberedGradeTokens: () => ["tok"],
  clearRememberedGradeTokens: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(trackProductEvent).mockClear();
});

describe("funnel events", () => {
  it("report_exported carries the format", () => {
    window.print = vi.fn();
    render(<ExportButton csvRows={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(trackProductEvent).toHaveBeenCalledWith("report_exported", { format: "print" });
  });

  it("grades_claimed fires with the count after a successful claim", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ claimed: 2 }) }));
    render(<ClaimGrades />);
    await waitFor(() => expect(trackProductEvent).toHaveBeenCalledWith("grades_claimed", { count: 2 }));
    vi.unstubAllGlobals();
  });
});
