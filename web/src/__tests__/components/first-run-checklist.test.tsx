import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { FirstRunChecklist } from "@/components/forensic/first-run-checklist";
import type { FirstRunStep } from "@/lib/first-run-steps";

afterEach(cleanup);

const steps = (done: boolean[]): FirstRunStep[] => [
  { label: "Grade a site", done: done[0] ?? false, href: "/grade", action: "Grade a site" },
  { label: "Save it as a project", done: done[1] ?? false, href: "/projects?url=x", action: "Save a project" },
  { label: "Re-grade after you fix it", done: done[2] ?? false, href: "/grade?url=x", action: "Re-grade the site" },
];

describe("FirstRunChecklist", () => {
  it("is an ordered list of three steps with real links", () => {
    render(<FirstRunChecklist steps={steps([false, false, false])} />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Grade a site" })).toHaveAttribute("href", "/grade");
    expect(screen.getByRole("link", { name: "Save a project" })).toHaveAttribute("href", "/projects?url=x");
  });

  it("says done or to do in text, not by color alone", () => {
    render(<FirstRunChecklist steps={steps([true, false, false])} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Done");
    expect(items[1]).toHaveTextContent("To do");
  });

  it("drops the action link on a finished step", () => {
    render(<FirstRunChecklist steps={steps([true, true, false])} />);
    expect(screen.queryByRole("link", { name: "Grade a site" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Re-grade the site" })).toBeInTheDocument();
  });

  it("never offers a Free account a paid feature as if it were usable", () => {
    const { container } = render(<FirstRunChecklist steps={steps([false, false, false])} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/schedule|run an audit|new scan/i);
    // The one mention of hosted persona runs states they belong to the paid plans.
    expect(text).toMatch(/Hosted persona runs come with the Solo and Agency founding plans/);
    expect(text).toMatch(/behind-login scans run in the CLI on your machine/);
  });
});
