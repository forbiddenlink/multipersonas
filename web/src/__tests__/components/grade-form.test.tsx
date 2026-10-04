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

  it("shows an in-page error for unusable input instead of relying on browser validation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GradeForm />);

    fireEvent.change(screen.getByLabelText("Public website URL"), {
      target: { value: "ftp://example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Use an http or https URL.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("adds https:// to a bare host like example.com", async () => {
    const token = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const fetchMock = vi.fn(async () => jsonResponse({ token }));
    vi.stubGlobal("fetch", fetchMock);

    render(<GradeForm />);

    fireEvent.change(screen.getByLabelText("Public website URL"), {
      target: { value: "example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/grade",
      expect.objectContaining({ body: JSON.stringify({ url: "https://example.com/" }) }),
    );
    expect(push).toHaveBeenCalledWith(`/grade/${token}`);
  });

  it("prefills the field from ?url= for a re-grade", async () => {
    window.history.pushState({}, "", "/grade?url=https%3A%2F%2Fexample.com%2Fa");
    render(<GradeForm />);
    expect(await screen.findByDisplayValue("https://example.com/a")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
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
      fireEvent.click(screen.getByRole("button", { name: /grade this site/i }));
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

describe("GradeForm while the human check is pending", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@marsidev/react-turnstile");
    vi.unstubAllEnvs();
  });

  it("keeps the button full-colour, focusable, and explains the wait", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    vi.resetModules();
    vi.doMock("@marsidev/react-turnstile", () => ({ Turnstile: () => null }));
    const { GradeForm: PendingForm } = await import("@/components/grade-form");
    render(<PendingForm />);

    const button = screen.getByRole("button", { name: /checking you.re human/i });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(button.getAttribute("aria-describedby")!)).toHaveTextContent(
      /unlocks once the human check/i,
    );
  });
});
