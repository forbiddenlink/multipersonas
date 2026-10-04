import { describe, it, expect } from "vitest";
import { afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FirstRunEmpty } from "@/components/forensic/first-run-empty";

afterEach(cleanup);

describe("FirstRunEmpty", () => {
  it("points a paid account at the form and offers no upgrade links", () => {
    render(<FirstRunEmpty canRunHosted />);
    expect(screen.getByText(/run your first audit/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("never mentions a form a free account cannot see", () => {
    render(<FirstRunEmpty canRunHosted={false} />);
    expect(screen.queryByText(/form/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Grade a public site" })).toHaveAttribute("href", "/grade");
    expect(screen.getByRole("link", { name: /behind login with the cli/i })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing");
  });
});
