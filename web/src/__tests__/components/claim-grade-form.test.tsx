import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaimGradeForm } from "@/components/claim-grade-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function submit(value: string) {
  render(<ClaimGradeForm />);
  fireEvent.change(screen.getByLabelText("Grade link"), { target: { value } });
  return act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
  });
}

describe("ClaimGradeForm", () => {
  it("has a labelled input and a status region", () => {
    render(<ClaimGradeForm />);
    expect(screen.getByLabelText("Grade link")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("rejects text that is not a grade link without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await submit("https://example.com/hello");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/grade link/i);
  });

  it("posts the token from a pasted link, confirms, and refreshes", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ claimed: 1 }) }));
    vi.stubGlobal("fetch", fetchMock);
    await submit(`https://personaudit.com/grade/${TOKEN}`);
    expect(fetchMock).toHaveBeenCalledWith("/api/grade/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: [TOKEN] }),
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 grade saved to your account."));
    expect(refresh).toHaveBeenCalled();
  });

  it("says plainly when nothing was saved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ claimed: 0 }) })));
    await submit(TOKEN);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Nothing was saved/));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: "x" }) })));
    await submit(TOKEN);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Could not save that grade/));
  });
});
