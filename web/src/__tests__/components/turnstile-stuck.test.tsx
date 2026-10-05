import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetTurnstile = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@marsidev/react-turnstile", async () => {
  const React = await import("react");

  type MockTurnstileProps = {
    onSuccess?: (token: string) => void;
    onError?: () => void;
    onBeforeInteractive?: () => void;
    onAfterInteractive?: () => void;
  };

  return {
    Turnstile: React.forwardRef<unknown, MockTurnstileProps>(function MockTurnstile(props, ref) {
      React.useImperativeHandle(ref, () => ({ reset: resetTurnstile }));
      return React.createElement(
        "div",
        null,
        React.createElement("button", { type: "button", onClick: () => props.onSuccess?.("turnstile-token") }, "Solve verification"),
        React.createElement("button", { type: "button", onClick: () => props.onError?.() }, "Fail verification"),
        React.createElement("button", { type: "button", onClick: () => props.onBeforeInteractive?.() }, "Show checkbox"),
        React.createElement("button", { type: "button", onClick: () => props.onAfterInteractive?.() }, "Click checkbox"),
      );
    }),
  };
});

async function renderGradeForm() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  const { GradeForm } = await import("@/components/grade-form");
  render(<GradeForm />);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetTurnstile.mockClear();
});

describe("GradeForm human check that never resolves", () => {
  it("keeps the waiting button while the check is still inside its time limit", async () => {
    await renderGradeForm();
    act(() => {
      vi.advanceTimersByTime(11_000);
    });
    expect(screen.getByRole("button", { name: /checking you.re human/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("explains the stall and offers Retry after 12 seconds", async () => {
    await renderGradeForm();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.queryByRole("button", { name: /checking you.re human/i })).not.toBeInTheDocument();
    expect(screen.getByText(/human check did not finish/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry the human check/i })).toBeInTheDocument();
  });

  it("shows the same message at once when the widget reports an error", async () => {
    await renderGradeForm();
    fireEvent.click(screen.getByRole("button", { name: "Fail verification" }));
    expect(screen.getByText(/human check did not finish/i)).toBeInTheDocument();
  });

  it("Retry resets the widget and starts a fresh wait", async () => {
    await renderGradeForm();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    fireEvent.click(screen.getByRole("button", { name: /retry the human check/i }));
    expect(resetTurnstile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/human check did not finish/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checking you.re human/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByText(/human check did not finish/i)).toBeInTheDocument();
  });

  it("does not bypass the check: a stalled form still refuses to submit", async () => {
    await renderGradeForm();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    const submit = screen.getByRole("button", { name: /grade this site/i });
    expect(submit).toHaveAttribute("aria-disabled", "true");
  });

  it("clears the message once the check passes", async () => {
    await renderGradeForm();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Solve verification" }));
    expect(screen.queryByText(/human check did not finish/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /grade this site/i })).not.toHaveAttribute("aria-disabled");
  });

  it("asks for the checkbox instead of reporting a failure when Cloudflare wants a click", async () => {
    await renderGradeForm();
    fireEvent.click(screen.getByRole("button", { name: "Show checkbox" }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.queryByText(/human check did not finish/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/tick the .verify you are human. box/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /grade this site/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("restarts the stall wait after the checkbox is clicked", async () => {
    await renderGradeForm();
    fireEvent.click(screen.getByRole("button", { name: "Show checkbox" }));
    fireEvent.click(screen.getByRole("button", { name: "Click checkbox" }));
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByText(/human check did not finish/i)).toBeInTheDocument();
  });
});
