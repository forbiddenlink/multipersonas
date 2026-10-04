import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  CHECKOUT_POLL_INTERVAL_MS,
  CHECKOUT_POLL_MAX_ATTEMPTS,
  CheckoutPlanWatcher,
  checkoutPollAction,
} from "@/components/checkout-plan-watcher";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("checkoutPollAction", () => {
  it("stops as soon as the plan is paid, whatever the attempt count", () => {
    expect(checkoutPollAction({ paid: true, attempts: 0 })).toBe("done");
    expect(checkoutPollAction({ paid: true, attempts: 99 })).toBe("done");
  });
  it("polls until the attempt budget is spent, then gives up", () => {
    expect(checkoutPollAction({ paid: false, attempts: 0 })).toBe("poll");
    expect(checkoutPollAction({ paid: false, attempts: CHECKOUT_POLL_MAX_ATTEMPTS - 1 })).toBe("poll");
    expect(checkoutPollAction({ paid: false, attempts: CHECKOUT_POLL_MAX_ATTEMPTS })).toBe("give-up");
  });
});

describe("CheckoutPlanWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("refreshes on an interval while free, in a polite live region, then stops after the budget", async () => {
    render(<CheckoutPlanWatcher paid={false} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent(/confirming your payment/i);

    // One interval per act: each tick re-renders and the effect schedules the next one.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CHECKOUT_POLL_INTERVAL_MS);
      });
    }
    expect(refresh).toHaveBeenCalledTimes(3);

    for (let i = 0; i < 30; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CHECKOUT_POLL_INTERVAL_MS);
      });
    }
    expect(refresh).toHaveBeenCalledTimes(CHECKOUT_POLL_MAX_ATTEMPTS);
    expect(screen.getByRole("status")).toHaveTextContent(/has not been updated yet/i);
  });

  it("never polls once the account is paid", async () => {
    render(<CheckoutPlanWatcher paid />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECKOUT_POLL_INTERVAL_MS * 5);
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Your account has paid access.");
  });
});
