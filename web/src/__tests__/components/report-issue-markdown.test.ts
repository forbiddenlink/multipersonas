import { describe, expect, it } from "vitest";
import {
  buildIssueBody,
  buildIssueChecklist,
  buildIssueMarkdown,
  buildIssueTitle,
  wcagUnderstandingUrl,
} from "@/app/(app)/audits/[id]/report-issue-markdown";

describe("buildIssueTitle", () => {
  it("names the rule, severity, and WCAG codes", () => {
    expect(
      buildIssueTitle({
        title: "Buttons must have discernible text",
        severity: "critical",
        wcagCodes: ["4.1.2"],
      }),
    ).toBe("[a11y] Buttons must have discernible text (Critical, WCAG 4.1.2)");
  });

  it("joins more than one WCAG code", () => {
    expect(
      buildIssueTitle({
        title: "Elements must meet minimum color contrast ratio",
        severity: "serious",
        wcagCodes: ["1.4.3", "1.4.11"],
      }),
    ).toBe("[a11y] Elements must meet minimum color contrast ratio (Serious, WCAG 1.4.3, 1.4.11)");
  });

  it("omits the WCAG segment when no codes are known", () => {
    expect(
      buildIssueTitle({ title: "Unlabeled region", severity: "moderate" }),
    ).toBe("[a11y] Unlabeled region (Moderate)");
  });
});

describe("buildIssueBody", () => {
  it("includes every field when all are available", () => {
    const body = buildIssueBody({
      title: "Buttons must have discernible text",
      severity: "critical",
      ruleId: "button-name",
      wcagCodes: ["4.1.2"],
      helpUrl: "https://dequeuniversity.com/rules/axe/4.10/button-name",
      locations: ["https://example.com/checkout"],
      target: "#dismiss-error",
      recommendation: "Give the button an accessible name.",
    });

    expect(body).toContain("**Where found**");
    expect(body).toContain("- https://example.com/checkout");
    expect(body).toContain("**Selector**");
    expect(body).toContain("#dismiss-error");
    expect(body).toContain("**WCAG criterion**");
    expect(body).toContain("[4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)");
    expect(body).toContain("- axe-core rule: `button-name`");
    expect(body).toContain("https://dequeuniversity.com/rules/axe/4.10/button-name");
    expect(body).toContain("**Suggested fix**");
    expect(body).toContain("Give the button an accessible name.");
    expect(body).toContain("_Found by Personaudit (axe-core)_");
  });

  it("degrades gracefully when optional evidence is missing, never fabricating it", () => {
    const body = buildIssueBody({
      title: "Unlabeled region",
      severity: "moderate",
    });

    expect(body).toContain("- Not recorded");
    expect(body).toContain("- axe-core rule: not recorded");
    expect(body).not.toContain("**Selector**");
    expect(body).not.toContain("**Suggested fix**");
    expect(body).toContain("_Found by Personaudit (axe-core)_");
  });

  it("never fabricates a link for a WCAG code it doesn't recognize", () => {
    const body = buildIssueBody({
      title: "Some future criterion",
      severity: "minor",
      wcagCodes: ["9.9.9"],
    });
    expect(body).toContain("- 9.9.9");
    expect(body).not.toContain("https://www.w3.org/WAI/WCAG22/Understanding/9.9.9");
  });
});

describe("wcagUnderstandingUrl", () => {
  it("derives the real W3C Understanding-doc slug from the criterion title", () => {
    expect(wcagUnderstandingUrl("1.4.3")).toBe(
      "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
    );
    expect(wcagUnderstandingUrl("2.1.1")).toBe(
      "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html",
    );
  });

  it("returns null for a code with no known criterion, never guessing", () => {
    expect(wcagUnderstandingUrl("9.9.9")).toBeNull();
  });
});

describe("buildIssueChecklist", () => {
  it("renders one Markdown task item per finding", () => {
    const checklist = buildIssueChecklist([
      {
        title: "Buttons must have discernible text",
        severity: "critical",
        ruleId: "button-name",
        wcagCodes: ["4.1.2"],
        locations: ["https://example.com/checkout"],
      },
      {
        title: "Unlabeled region",
        severity: "moderate",
      },
    ]);

    expect(checklist).toContain("## Open accessibility findings");
    expect(checklist).toContain(
      "- [ ] **Critical** Buttons must have discernible text (`button-name`), WCAG 4.1.2 · found at https://example.com/checkout",
    );
    expect(checklist).toContain("- [ ] **Moderate** Unlabeled region");
    expect(checklist).toContain("_Found by Personaudit (axe-core)_");
  });

  it("stays valid Markdown with no open findings, never an empty string", () => {
    const checklist = buildIssueChecklist([]);
    expect(checklist).toContain("## Open accessibility findings");
    expect(checklist).toContain("_No open findings recorded._");
  });
});

describe("buildIssueMarkdown", () => {
  it("is the title, a blank line, then the body", () => {
    const finding = {
      title: "Buttons must have discernible text",
      severity: "critical",
      ruleId: "button-name",
      wcagCodes: ["4.1.2"],
    };
    expect(buildIssueMarkdown(finding)).toBe(
      `${buildIssueTitle(finding)}\n\n${buildIssueBody(finding)}`,
    );
  });
});


it("carries failed scan evidence into copied Markdown even when no violations were saved", () => {
  const checklist = buildIssueChecklist([], { checks: [{ url: "https://example.com/checkout", step: 3, status: "failed", error: "axe timed out" }], executionFailures: [{ url: "https://example.com", error: "navigation failed" }] });
  expect(checklist).toContain("Scan coverage incomplete");
  expect(checklist).toContain("https://example.com/checkout");
  expect(checklist).toContain("axe timed out");
  expect(checklist).toContain("navigation failed");
});
