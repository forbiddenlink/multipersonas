import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradeFindingRow } from "@/components/dossier/grade-finding-row";

function renderRow(fixFirst?: boolean) {
  return render(
    <ul>
      <GradeFindingRow
        ruleId="color-contrast"
        severity="serious"
        help="Elements must meet minimum color contrast ratio thresholds"
        nodes={3}
        wcagAA
        fixFirst={fixFirst}
      />
    </ul>,
  );
}

afterEach(cleanup);

describe("GradeFindingRow fix-first label", () => {
  it("shows the label when the finding is top priority", () => {
    renderRow(true);
    expect(screen.getByText("Fix first")).toBeTruthy();
  });

  it("omits the label by default", () => {
    renderRow();
    expect(screen.queryByText("Fix first")).toBeNull();
  });

  it("links every rule to its Deque University docs", () => {
    render(<ul><GradeFindingRow ruleId="color-contrast" severity="serious" help="Contrast" nodes={2} wcagAA /></ul>);
    const link = screen.getByRole("link", { name: /learn more about color-contrast/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/dequeuniversity\.com\/rules\/axe\/\d+\.\d+\/color-contrast$/));
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("GradeFindingRow WCAG citation", () => {
  it("labels a best-practice rule as best-practice even when remediation cites a criterion", () => {
    // axe tags `region` best-practice; the remediation entry still names 1.3.1. Citing it
    // beside "0 WCAG A/AA failures" contradicts the headline count.
    render(<ul><GradeFindingRow ruleId="region" severity="moderate" help="Regions" nodes={1} wcagAA={false} /></ul>);
    expect(screen.getByText("best-practice")).toBeTruthy();
    expect(screen.queryByText(/\[WCAG /)).toBeNull();
  });

  it("cites the criterion for a WCAG A/AA rule", () => {
    render(<ul><GradeFindingRow ruleId="color-contrast" severity="serious" help="Contrast" nodes={2} wcagAA /></ul>);
    expect(screen.getByText("[WCAG 1.4.3]")).toBeTruthy();
    expect(screen.queryByText("best-practice")).toBeNull();
  });

  it("keeps citations for older reports that predate the wcagAA field", () => {
    render(<ul><GradeFindingRow ruleId="color-contrast" severity="serious" help="Contrast" nodes={2} /></ul>);
    expect(screen.getByText("[WCAG 1.4.3]")).toBeTruthy();
  });
});

describe("GradeFindingRow located elements", () => {
  const examples = [
    { url: "https://example.com/pricing", target: "main > img.hero", html: "<img class=\"hero\">" },
    { url: "https://example.com/", target: "#host >>> img", html: "<img>" },
  ];

  it("lists each element's page path, selector and HTML as text", () => {
    render(<ul><GradeFindingRow ruleId="image-alt" severity="critical" help="Alt" nodes={5} wcagAA examples={examples} /></ul>);
    expect(screen.getByText("Where: 2 of 5 elements")).toBeTruthy();
    expect(screen.getByText("/pricing")).toBeTruthy();
    expect(screen.getByText("main > img.hero")).toBeTruthy();
    // Rendered as text, never as markup.
    expect(screen.getByText("<img class=\"hero\">").tagName).toBe("CODE");
  });

  it("renders nothing extra for reports stored before examples existed", () => {
    render(<ul><GradeFindingRow ruleId="image-alt" severity="critical" help="Alt" nodes={5} wcagAA /></ul>);
    expect(screen.queryByText(/^Where:/)).toBeNull();
  });
});

