import { describe, expect, it } from "vitest";
import { displayFinding, learnMoreUrl } from "@/lib/finding-display";

const DEQUE = "https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=playwright";
const URL_ONLY = `See ${DEQUE} for remediation guidance.`;

describe("learnMoreUrl", () => {
  it("strips the tracking query from a Deque help url", () => {
    expect(learnMoreUrl(DEQUE)).toBe("https://dequeuniversity.com/rules/axe/4.12/color-contrast");
  });
  it("returns null for something that is not an http(s) url", () => {
    expect(learnMoreUrl("javascript:alert(1)")).toBeNull();
    expect(learnMoreUrl("nope")).toBeNull();
  });
});

describe("displayFinding", () => {
  it("uses the plain title, why and fix for a rule in the remediation table", () => {
    const d = displayFinding({
      ruleId: "color-contrast",
      title: "Elements must meet minimum color contrast ratio thresholds",
      description: "Ensure the contrast between foreground and background colors meets WCAG 2 AA",
      recommendation: URL_ONLY,
    });
    expect(d.title).toBe("Text that is hard to read");
    expect(d.why).toMatch(/low-vision/);
    expect(d.fix).toMatch(/4\.5:1/);
    expect(d.learnMore).toBe("https://dequeuniversity.com/rules/axe/4.12/color-contrast");
    expect(d.ruleId).toBe("color-contrast");
  });

  it("falls back to axe help text for an unknown rule and drops the url sentence", () => {
    const d = displayFinding({
      ruleId: "some-new-rule",
      title: "Some axe help text",
      description: "axe description",
      recommendation: "See https://dequeuniversity.com/rules/axe/4.12/some-new-rule?application=playwright for remediation guidance.",
    });
    expect(d.title).toBe("Some axe help text");
    expect(d.why).toBe("axe description");
    expect(d.fix).toBeNull();
    expect(d.learnMore).toBe("https://dequeuniversity.com/rules/axe/4.12/some-new-rule");
  });

  it("keeps a real recommendation that is not the url sentence", () => {
    const d = displayFinding({ ruleId: null, title: "t", description: "d", recommendation: "Add an alt attribute." });
    expect(d.fix).toBe("Add an alt attribute.");
    expect(d.learnMore).toBeNull();
  });
});
