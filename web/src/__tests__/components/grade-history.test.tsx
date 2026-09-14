import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradeHistory } from "@/components/grade-history";

afterEach(() => {
  cleanup();
});

describe("GradeHistory", () => {
  it("points an empty dashboard at the free public grade, not hosted behind-login", () => {
    render(<GradeHistory grades={[]} />);
    expect(screen.getByText(/no saved grades yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /run a free grade/i })).toHaveAttribute("href", "/grade");
    expect(screen.getByText(/Behind-login scans stay in the CLI/i)).toBeInTheDocument();
  });

  it("links each saved grade to its public share page", () => {
    render(
      <GradeHistory
        grades={[
          {
            token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            entry_url: "https://example.com/pricing",
            status: "completed",
            letter: "B",
            created_at: "2026-09-13T00:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /example.com/i })).toHaveAttribute(
      "href",
      "/grade/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
