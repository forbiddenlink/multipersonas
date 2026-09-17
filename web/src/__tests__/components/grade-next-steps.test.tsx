import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GradeNextSteps } from "@/components/grade-next-steps";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

afterEach(() => {
  cleanup();
  trackProductEvent.mockClear();
});

describe("GradeNextSteps", () => {
  it("asks a signed-out visitor to save the grade, then leads with the working CLI path", () => {
    render(
      <GradeNextSteps
        signedIn={false}
        pagesScanned={4}
        entryUrl="https://example.com/pricing"
      />,
    );

    const save = screen.getByRole("link", { name: "Save this grade" });
    expect(save).toHaveAttribute(
      "href",
      "/auth/signup?returnTo=%2Fprojects%3Furl%3Dhttps%253A%252F%252Fexample.com%252Fpricing",
    );
    expect(screen.getByRole("link", { name: "Scan a logged-in flow with the CLI" })).toHaveAttribute(
      "href",
      "/guides/ci-accessibility-gate",
    );
    expect(screen.getByRole("link", { name: "See founding access" })).toHaveAttribute(
      "href",
      "/for-agencies#early-access",
    );
    expect(screen.getByText(/4 public pages only/)).toBeInTheDocument();

    fireEvent.click(save);
    expect(trackProductEvent).toHaveBeenCalledWith("grade_save_clicked", { signed_in: false });

    fireEvent.click(screen.getByRole("link", { name: "Scan a logged-in flow with the CLI" }));
    expect(trackProductEvent).toHaveBeenCalledWith("grade_cli_guide_clicked", { from: "grade_result" });
  });

  it("sends a signed-in visitor to the dashboard instead of a second signup", () => {
    render(
      <GradeNextSteps signedIn pagesScanned={1} entryUrl="https://example.com" />,
    );

    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Save this grade" })).not.toBeInTheDocument();
    expect(screen.getByText(/1 public page only/)).toBeInTheDocument();
  });
});
