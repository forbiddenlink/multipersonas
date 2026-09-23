import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UnlockFoundingAccessButton } from "@/components/unlock-founding-access-button";

const trackProductEvent = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  trackProductEvent.mockClear();
  window.history.replaceState(null, "", "/");
});

describe("UnlockFoundingAccessButton", () => {
  it("offers a safe return path to sign in when checkout requires an account", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: "Sign in before starting checkout." }),
    })));

    render(<UnlockFoundingAccessButton />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /unlock founding access/i }));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in or create an account/i })).toHaveAttribute(
      "href",
      "/auth/login?returnTo=%2Ffor-agencies%3Fcheckout%3Dready%23early-access",
    );
    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_clicked", {
      price_usd: 199,
      funnel_location: "agency_founding_section",
    });
    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_auth_required", { resuming: false });
  });

  it("records checkout start after a session is created and before navigating away", async () => {
    const assign = vi.fn();
    const testWindow = Object.create(window) as Window;
    Object.defineProperty(testWindow, "location", {
      value: {
        assign,
        hash: window.location.hash,
        pathname: window.location.pathname,
        search: window.location.search,
      },
    });
    vi.stubGlobal("window", testWindow);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session" }),
    })));

    render(<UnlockFoundingAccessButton />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /unlock founding access/i }));
    });

    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_started", { resuming: false });
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/session");
  });

  it("records a provider failure without sending checkout response details to analytics", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 503,
      ok: false,
      json: async () => ({ error: "Provider request req_123 failed" }),
    })));

    render(<UnlockFoundingAccessButton />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /unlock founding access/i }));
    });

    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_failed", {
      reason: "provider_error",
      status_code: 503,
      resuming: false,
    });
  });

  it("records a network failure with a coarse reason", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("Connection to billing provider failed");
    }));

    render(<UnlockFoundingAccessButton />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /unlock founding access/i }));
    });

    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_failed", {
      reason: "network_error",
      resuming: false,
    });
  });

  it("resumes an explicit checkout attempt after the user signs in", async () => {
    const fetchMock = vi.fn(async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: "Sign in before starting checkout." }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/for-agencies?checkout=ready#early-access");

    render(<UnlockFoundingAccessButton />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/checkout/founding", { method: "POST" });
      expect(screen.getByRole("link", { name: /sign in or create an account/i })).toBeInTheDocument();
    });

    expect(trackProductEvent).not.toHaveBeenCalledWith("founding_checkout_clicked", expect.anything());
    expect(trackProductEvent).toHaveBeenCalledWith("founding_checkout_auth_required", { resuming: true });
    expect(window.location.search).not.toContain("checkout=ready");
  });
});
