import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PaidPanelsNote } from "@/components/paid-panels-note";
import { ProjectFixFirst } from "@/components/project-fix-first";
import type { FixFirstItem } from "@/lib/grade-fix-first";

afterEach(cleanup);

describe("PaidPanelsNote", () => {
  it("is one section that lists what paid adds with a single link to pricing", () => {
    render(<PaidPanelsNote />);
    expect(screen.getByRole("heading", { level: 2, name: "On Solo and up" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/pricing");
  });

  it("renders no form controls a Free account cannot use", () => {
    const { container } = render(<PaidPanelsNote />);
    expect(container.querySelector("input, textarea, select, button")).toBeNull();
  });
});

const item = (over: Partial<FixFirstItem> = {}): FixFirstItem => ({
  ruleId: "button-name",
  title: "Buttons with no name",
  impact: "critical",
  pages: { count: 4, exact: true },
  nodes: 6,
  why: "Screen reader users hear only 'button'.",
  ...over,
});

describe("ProjectFixFirst", () => {
  it("lists the top fixes for the site and links the full grade", () => {
    render(<ProjectFixFirst host="acme.com" token="tok-1" pagesScanned={10} items={[item(), item({ ruleId: "image-alt", title: "Images with no text alternative" })]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Fix these first on acme.com" })).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Buttons with no name")).toBeInTheDocument();
    expect(screen.getAllByText(/On 4 of 10 pages scanned/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Open the full grade/ })).toHaveAttribute("href", "/grade/tok-1");
  });

  it("falls back to a link to the latest grade when there is nothing to rank", () => {
    render(<ProjectFixFirst host="acme.com" token="tok-1" pagesScanned={0} items={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open your latest grade of acme.com/ })).toHaveAttribute("href", "/grade/tok-1");
  });
});
