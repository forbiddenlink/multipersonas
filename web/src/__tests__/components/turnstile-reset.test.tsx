import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
const resetTurnstile = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@marsidev/react-turnstile", async () => {
  const React = await import("react");

  type MockTurnstileProps = {
    onSuccess?: (token: string) => void;
  };

  return {
    Turnstile: React.forwardRef<unknown, MockTurnstileProps>(function MockTurnstile(
      props,
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ reset: resetTurnstile }));

      return React.createElement(
        "button",
        {
          type: "button",
          onClick: () => props.onSuccess?.("turnstile-token"),
        },
        "Solve verification",
      );
    }),
  };
});

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response;
}

async function importTurnstileForm<TModule>(path: string): Promise<TModule> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");

  return import(path) as Promise<TModule>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  push.mockClear();
  resetTurnstile.mockClear();
});

describe("Turnstile-backed forms", () => {
  it("resets the grade widget after a rejected submit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "Verification failed." }, false));
    vi.stubGlobal("fetch", fetchMock);

    const { GradeForm } = await importTurnstileForm<typeof import("@/components/grade-form")>(
      "@/components/grade-form",
    );

    render(<GradeForm />);
    fireEvent.change(screen.getByLabelText("Public website URL"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /solve verification/i }));
    fireEvent.click(screen.getByRole("button", { name: /get my grade/i }));

    await waitFor(() => expect(resetTurnstile).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/",
        turnstileToken: "turnstile-token",
      }),
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("resets the waitlist widget after a rejected submit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "Verification failed." }, false));
    vi.stubGlobal("fetch", fetchMock);

    const { WaitlistForm } = await importTurnstileForm<
      typeof import("@/components/waitlist-form")
    >("@/components/waitlist-form");

    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "liz@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /solve verification/i }));
    fireEvent.click(screen.getByRole("button", { name: /request founding access/i }));

    await waitFor(() => expect(resetTurnstile).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "liz@example.com",
        sitesCount: undefined,
        note: undefined,
        attribution: {},
        turnstileToken: "turnstile-token",
      }),
    });
  });
});
