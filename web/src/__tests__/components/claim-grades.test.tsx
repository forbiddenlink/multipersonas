import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaimGrades } from "@/components/claim-grades";
import { GRADE_TOKEN_STORAGE_KEY } from "@/lib/grade-tokens";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
  localStorage.clear();
});

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("ClaimGrades", () => {
  it("claims remembered tokens and refreshes the dashboard when any attach", async () => {
    localStorage.setItem(GRADE_TOKEN_STORAGE_KEY, JSON.stringify([TOKEN]));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ claimed: 1 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<ClaimGrades />);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/grade/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: [TOKEN] }),
    });
    expect(localStorage.getItem(GRADE_TOKEN_STORAGE_KEY)).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps remembered tokens when the session is missing", async () => {
    localStorage.setItem(GRADE_TOKEN_STORAGE_KEY, JSON.stringify([TOKEN]));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: "Sign in to save grades." }),
      })),
    );

    await act(async () => {
      render(<ClaimGrades />);
    });

    expect(JSON.parse(localStorage.getItem(GRADE_TOKEN_STORAGE_KEY) ?? "[]")).toEqual([TOKEN]);
    expect(refresh).not.toHaveBeenCalled();
  });
});
