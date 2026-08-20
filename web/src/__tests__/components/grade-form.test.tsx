import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GradeForm } from "@/components/grade-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("GradeForm", () => {
  it("shows an in-page error for incomplete URLs instead of relying on browser validation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GradeForm />);

    fireEvent.change(screen.getByLabelText("Public website URL"), {
      target: { value: "example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /get my grade/i }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a full URL, like https://example.com.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("queues normalized http/https URLs and navigates to the grade page", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ token: "grade-token-1" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<GradeForm />);

    fireEvent.change(screen.getByLabelText("Public website URL"), {
      target: { value: " https://example.com " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /get my grade/i }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/" }),
    });
    expect(push).toHaveBeenCalledWith("/grade/grade-token-1");
  });
});
