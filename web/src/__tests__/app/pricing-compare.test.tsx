import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => null }));
vi.mock("@/components/grade-form", () => ({ GradeForm: () => null }));
vi.mock("@/components/start-solo-plan-button", () => ({ StartSoloPlanButton: () => null }));
vi.mock("@/components/unlock-founding-access-button", () => ({ UnlockFoundingAccessButton: () => null }));
import PricingPage from "@/app/pricing/page";
import { PROJECT_LIMITS } from "@/lib/entitlements";

afterEach(cleanup);

/** Cell text a screen reader announces: the visual check and dash glyphs are aria-hidden. */
function spoken(cells: HTMLElement[]): string[] {
  return cells.map((c) => (c.textContent ?? "").replace(/[\u2713\u2014]/g, ""));
}

function row(name: string): HTMLElement {
  const table = screen.getByRole("table", { name: /what each plan includes/i });
  return within(table).getByRole("row", { name: new RegExp(`^${name}`) });
}

describe("pricing plan comparison", () => {
  it("has one column per plan", () => {
    render(<PricingPage />);
    const table = screen.getByRole("table", { name: /what each plan includes/i });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers[1]).toMatch(/^Free/);
    expect(headers[2]).toMatch(/^Solo/);
    expect(headers[3]).toMatch(/^Agency founding/);
  });

  it("states the enforced project caps per plan", () => {
    render(<PricingPage />);
    const cells = within(row("Hosted projects")).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual([String(PROJECT_LIMITS.free), String(PROJECT_LIMITS.pro), "Unlimited"]);
  });

  it("gates scheduled re-scans and white-label the way the code does", () => {
    render(<PricingPage />);
    expect(spoken(within(row("Scheduled re-scans")).getAllByRole("cell"))).toEqual([
      "Not included",
      "Included",
      "Included",
    ]);
    expect(spoken(within(row("White-label evidence report")).getAllByRole("cell"))).toEqual([
      "Not included",
      "Not included",
      "Included",
    ]);
  });

  it("marks hosted behind-login as roadmap on every plan", () => {
    render(<PricingPage />);
    const cells = within(row("Hosted behind-login scan")).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["Roadmap", "Roadmap", "Roadmap"]);
  });
});
