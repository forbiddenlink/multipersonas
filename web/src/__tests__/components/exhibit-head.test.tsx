import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExhibitHead } from "@/components/dossier/exhibit-head";

afterEach(cleanup);

describe("ExhibitHead", () => {
  it("renders the tab as the section heading when given a heading id", () => {
    render(<ExhibitHead label="Saved grades" headingId="grades-heading" />);
    const heading = screen.getByRole("heading", { level: 2, name: "Saved grades" });
    expect(heading).toHaveAttribute("id", "grades-heading");
    expect(screen.getAllByText("Saved grades")).toHaveLength(1);
  });

  it("stays a plain label without a heading id", () => {
    render(<ExhibitHead label="Case desk" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Case desk").tagName).toBe("P");
  });

  it("plain variant keeps the heading and drops the exhibit motif", () => {
    const { container } = render(<ExhibitHead plain label="Saved grades" headingId="g" />);
    expect(screen.getByRole("heading", { level: 2, name: "Saved grades" })).toHaveAttribute("id", "g");
    expect(container.querySelector(".exhibit-head, .exhibit-tab, .exhibit-serial")).toBeNull();
  });
});
