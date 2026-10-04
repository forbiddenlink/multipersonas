import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }),
}));

async function load(key: string | undefined) {
  vi.resetModules();
  if (key === undefined) vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  else vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  const { PostHogIdentify } = await import("@/components/posthog-identify");
  const { SignOutButton } = await import("@/components/sign-out-button");
  return { PostHogIdentify, SignOutButton };
}

beforeEach(() => {
  posthogMock.identify.mockClear();
  posthogMock.reset.mockClear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PostHogIdentify", () => {
  it("identifies by user id with the plan only, once per session", async () => {
    const { PostHogIdentify } = await load("phc_test");
    const { rerender, unmount } = render(<PostHogIdentify userId="user-1" plan="pro" />);
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);
    expect(posthogMock.identify).toHaveBeenCalledWith("user-1", { plan: "pro" });

    rerender(<PostHogIdentify userId="user-1" plan="pro" />);
    unmount();
    render(<PostHogIdentify userId="user-1" plan="pro" />);
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);
  });

  it("sends no email or name", async () => {
    const { PostHogIdentify } = await load("phc_test");
    render(<PostHogIdentify userId="user-2" plan="free" />);
    const [, props] = posthogMock.identify.mock.calls[0]!;
    expect(Object.keys(props)).toEqual(["plan"]);
    expect(JSON.stringify(posthogMock.identify.mock.calls)).not.toMatch(/@|email|name/i);
  });

  it("is a no-op when PostHog is not configured", async () => {
    const { PostHogIdentify, SignOutButton } = await load(undefined);
    render(<PostHogIdentify userId="user-3" />);
    expect(posthogMock.identify).not.toHaveBeenCalled();

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(window.sessionStorage.length).toBe(0));
    expect(posthogMock.reset).not.toHaveBeenCalled();
  });
});

describe("SignOutButton analytics", () => {
  it("resets the PostHog identity and lets the next sign-in identify again", async () => {
    const { PostHogIdentify, SignOutButton } = await load("phc_test");
    render(<PostHogIdentify userId="user-4" />);
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(posthogMock.reset).toHaveBeenCalledTimes(1));

    render(<PostHogIdentify userId="user-4" />);
    expect(posthogMock.identify).toHaveBeenCalledTimes(2);
  });
});
