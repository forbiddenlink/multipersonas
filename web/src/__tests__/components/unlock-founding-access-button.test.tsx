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

    expect(trackProductEvent).not.toHaveBeenCalled();
    expect(window.location.search).not.toContain("checkout=ready");
  });
});
