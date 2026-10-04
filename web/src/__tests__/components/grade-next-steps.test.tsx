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

    const save = screen.getByRole("link", { name: "Save and track this site" });
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
    expect(screen.queryByRole("link", { name: "Save and track this site" })).not.toBeInTheDocument();
    expect(screen.getByText(/1 public page only/)).toBeInTheDocument();
  });
});

describe("GradeNextSteps print behaviour", () => {
  afterEach(cleanup);

  it("keeps the untested-flow checklist printable and hides only the conversion controls", () => {
    const { container } = render(<GradeNextSteps signedIn={false} pagesScanned={3} entryUrl="https://example.com" />);
    const hidden = Array.from(container.querySelectorAll(".grade-print-hide"));
    const checklist = screen.getByText(/Keyboard-only navigation/);
    expect(hidden.some((el) => el.contains(checklist))).toBe(false);
    expect(hidden.some((el) => el.contains(screen.getByRole("link", { name: "Save and track this site" })))).toBe(true);
    expect(hidden.some((el) => el.contains(screen.getByRole("link", { name: /founding access/i })))).toBe(true);
    expect(hidden.some((el) => el.contains(screen.getByText(/Create an account and this grade/)))).toBe(true);
  });
});

describe("GradeNextSteps bridge to fixing and tracking", () => {
  afterEach(cleanup);

  it("tells a signed-out visitor to save the site and re-grade after fixing, with one filled primary", () => {
    const { container } = render(<GradeNextSteps signedIn={false} pagesScanned={3} entryUrl="https://example.com" />);
    expect(screen.getByText("Save this site and re-grade after you fix it.")).toBeInTheDocument();
    expect(screen.getByText(/lists each saved grade/)).toBeInTheDocument();
    // One filled primary: the save link. Every other link is a text link.
    const filled = Array.from(container.querySelectorAll("a")).filter((a) => /bg-primary/.test(a.className));
    expect(filled).toHaveLength(1);
    expect(filled[0]).toHaveTextContent("Save and track this site");
  });

  it("tells a signed-in visitor to re-grade after fixing", () => {
    render(<GradeNextSteps signedIn pagesScanned={3} entryUrl="https://example.com" />);
    expect(screen.getByText("Re-grade after you fix it.")).toBeInTheDocument();
  });
});
