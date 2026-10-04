import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GradeShare } from "@/components/grade-share";

vi.mock("@/lib/analytics", () => ({ trackProductEvent: vi.fn() }));

afterEach(cleanup);

describe("GradeShare", () => {
  it("offers LinkedIn, X and copy-link with honest prefilled text and 44px targets", () => {
    render(<GradeShare token="tok-1" host="example.com" grade="B" />);
    expect(screen.getByRole("heading", { level: 2, name: "Share this grade" })).toBeInTheDocument();

    const li = screen.getByRole("link", { name: /share on linkedin/i });
    expect(new URL(li.getAttribute("href")!).searchParams.get("url")).toMatch(/\/grade\/tok-1$/);
    expect(li).toHaveAttribute("rel", "noopener noreferrer");
    expect(li.className).toMatch(/min-h-11/);

    const x = screen.getByRole("link", { name: /share on x/i });
    const params = new URL(x.getAttribute("href")!).searchParams;
    expect(params.get("text")).toBe("example.com scored B on Personaudit's automated accessibility grade");
    expect(params.get("url")).toMatch(/\/grade\/tok-1$/);

    expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument();
  });
});
