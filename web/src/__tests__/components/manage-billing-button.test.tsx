import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ManageBillingButton } from "@/components/manage-billing-button";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  trackProductEvent.mockClear();
});

describe("ManageBillingButton", () => {
  it("opens the billing portal returned by the server", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://billing.stripe.com/session/test" }),
    })));

    render(<ManageBillingButton />);
    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    expect(await screen.findByRole("button", { name: "Opening billing…" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledWith("/api/billing/portal", { method: "POST" });
    expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/session/test");
    expect(trackProductEvent).toHaveBeenCalledWith("billing_portal_started");
  });

  it("shows the server error and does not navigate", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "Could not open billing. Email billing support from Settings." }),
    })));

    render(<ManageBillingButton />);
    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email billing support from Settings.");
    expect(assign).not.toHaveBeenCalled();
    expect(trackProductEvent).toHaveBeenCalledWith("billing_portal_failed", {
      reason: "provider_error",
      status_code: 503,
    });
  });
});
