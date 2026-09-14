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
  it("asks a signed-out visitor to save the grade, then offers the behind-login path", () => {
    render(<GradeNextSteps signedIn={false} pagesScanned={4} />);

    const save = screen.getByRole("link", { name: "Save this grade" });
    expect(save).toHaveAttribute("href", "/auth/signup?returnTo=/dashboard");
    expect(screen.getByRole("link", { name: "Scan behind the login" })).toHaveAttribute(
      "href",
      "/for-agencies",
    );
    expect(screen.getByText(/4 public pages only/)).toBeInTheDocument();

    fireEvent.click(save);
    expect(trackProductEvent).toHaveBeenCalledWith("grade_save_clicked", { signed_in: false });
  });

  it("sends a signed-in visitor to the dashboard instead of a second signup", () => {
    render(<GradeNextSteps signedIn pagesScanned={1} />);

    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Save this grade" })).not.toBeInTheDocument();
    expect(screen.getByText(/1 public page only/)).toBeInTheDocument();
  });
});
