import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GradeOfferLink } from "@/components/grade-offer-link";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

afterEach(() => {
  cleanup();
  trackProductEvent.mockClear();
});

describe("GradeOfferLink", () => {
  it("points at the offer without depending on analytics", () => {
    render(<GradeOfferLink>Scan behind the login</GradeOfferLink>);

    expect(screen.getByRole("link", { name: "Scan behind the login" })).toHaveAttribute(
      "href",
      "/for-agencies",
    );
  });

  it("labels the click with its origin so grade-to-offer reads separately from cold traffic", () => {
    render(<GradeOfferLink>Scan behind the login</GradeOfferLink>);

    fireEvent.click(screen.getByRole("link", { name: "Scan behind the login" }));

    expect(trackProductEvent).toHaveBeenCalledWith("grade_offer_clicked", {
      from: "grade_result",
    });
  });
});
