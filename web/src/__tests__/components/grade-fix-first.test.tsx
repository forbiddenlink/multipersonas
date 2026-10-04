import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradeFixFirst } from "@/components/grade-fix-first";
import type { GradeRuleHit } from "@engine/grader/score";

afterEach(cleanup);

const rule = (over: Partial<GradeRuleHit> = {}): GradeRuleHit => ({
  id: "button-name",
  impact: "critical",
  nodes: 6,
  help: "Buttons must have discernible text",
  wcagAA: true,
  pages: 4,
  sharedTarget: { target: "header .menu-btn", pages: 4 },
  ...over,
});

describe("GradeFixFirst", () => {
  it("lists the top items as an ordered list under a heading, with plain titles", () => {
    render(
      <GradeFixFirst
        pagesScanned={10}
        rules={[rule(), rule({ id: "image-alt", sharedTarget: undefined, pages: 2 }), rule({ id: "label", impact: "serious", pages: 1, sharedTarget: undefined })]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Fix these first" })).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole("heading", { level: 3, name: "Buttons with no name" })).toBeInTheDocument();
    expect(screen.queryByText("button-name")).not.toBeInTheDocument();
  });

  it("says how many pages, and fix once with the shared selector", () => {
    render(<GradeFixFirst pagesScanned={10} rules={[rule()]} />);
    expect(screen.getByText(/On 4 of 10 pages scanned/)).toBeInTheDocument();
    expect(screen.getByText(/Fix once, clears 4 pages/)).toBeInTheDocument();
    expect(screen.getByText("header .menu-btn")).toBeInTheDocument();
  });

  it("does not claim fix-once when no selector repeats", () => {
    render(<GradeFixFirst pagesScanned={10} rules={[rule({ sharedTarget: undefined })]} />);
    expect(screen.queryByText(/Fix once/)).not.toBeInTheDocument();
  });

  it("marks a page count from an older report as a lower bound", () => {
    render(<GradeFixFirst pagesScanned={10} rules={[rule({ pages: undefined, sharedTarget: undefined, examples: [{ url: "https://x.test/", target: "a", html: "" }] })]} />);
    expect(screen.getByText(/On at least 1 of 10 pages scanned/)).toBeInTheDocument();
  });

  it("states who is blocked from the rule and that it is inferred, never simulated", () => {
    render(<GradeFixFirst pagesScanned={3} rules={[rule()]} />);
    expect(screen.getByText(/screen reader announces the control as just/i)).toBeInTheDocument();
    expect(screen.getByText(/inferred from the rule, not simulated/i)).toBeInTheDocument();
  });

  it("links each item to its row in the full findings list", () => {
    render(<GradeFixFirst pagesScanned={3} rules={[rule()]} />);
    expect(screen.getByRole("link", { name: /See the details for Buttons with no name/ })).toHaveAttribute("href", "#finding-button-name");
  });

  it("renders nothing when there is nothing to fix first", () => {
    const { container } = render(<GradeFixFirst pagesScanned={3} rules={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a report stored without rules", () => {
    const { container } = render(<GradeFixFirst pagesScanned={3} rules={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
