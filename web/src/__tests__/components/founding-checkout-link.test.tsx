import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FoundingCheckoutLink } from "@/components/founding-checkout-link";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

afterEach(() => {
  cleanup();
  trackProductEvent.mockClear();
});

describe("FoundingCheckoutLink", () => {
  it("navigates with a real href so checkout never depends on analytics loading", () => {
    render(
      <FoundingCheckoutLink href="https://buy.stripe.com/test_123">
        Get founding access
      </FoundingCheckoutLink>,
    );

    expect(screen.getByRole("link", { name: "Get founding access" })).toHaveAttribute(
      "href",
      "https://buy.stripe.com/test_123",
    );
  });

  it("records the click, which is the demand test's denominator", () => {
    render(
      <FoundingCheckoutLink href="https://buy.stripe.com/test_123">
        Get founding access
      </FoundingCheckoutLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Get founding access" }));

    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_clicked", {
      price_usd: 199,
      funnel_location: "unknown",
    });
  });
});
