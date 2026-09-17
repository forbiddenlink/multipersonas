import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GradeForm } from "@/components/grade-form";
import { GRADE_TOKEN_STORAGE_KEY } from "@/lib/grade-tokens";

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
  localStorage.clear();
});

describe("GradeForm", () => {
  it("sets an honest free-grade scope and names the result before submission", () => {
    render(<GradeForm />);

    expect(screen.getByText("Up to 10 same-site public pages. Use the CLI for logged-in flows.")).toBeInTheDocument();
    const summary = screen.getByLabelText("What your free grade includes");
    expect(summary).toHaveTextContent("letter grade");
    expect(summary).toHaveTextContent("pages reached");
    expect(summary).toHaveTextContent("named axe rules");
  });

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
    const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fetchMock = vi.fn(async () => jsonResponse({ token }));
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
    expect(push).toHaveBeenCalledWith(`/grade/${token}`);
    expect(JSON.parse(localStorage.getItem(GRADE_TOKEN_STORAGE_KEY) ?? "[]")).toEqual([token]);
  });
});
