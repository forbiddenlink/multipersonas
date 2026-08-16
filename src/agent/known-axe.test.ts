import { describe, it, expect } from "vitest";
import {
  formatKnownAxeForPage,
  MAX_KNOWN_AXE_RULES,
  type KnownAxeFinding,
} from "./known-axe.js";

const page = "https://shop.test/cart";
const other = "https://shop.test/home";

const f = (over: Partial<KnownAxeFinding> = {}): KnownAxeFinding => ({
  pageUrl: page,
  severity: "serious",
  ruleId: "color-contrast",
  title: "Elements must have sufficient color contrast",
  ...over,
});

describe("formatKnownAxeForPage", () => {
  it("returns null when there are no findings", () => {
    expect(formatKnownAxeForPage([], page)).toBeNull();
  });

  it("returns null when findings belong to a different page", () => {
    expect(formatKnownAxeForPage([f({ pageUrl: other, seenOn: [other] })], page)).toBeNull();
  });

  it("lists current-page verdicts as ground truth the model must not re-derive", () => {
    const text = formatKnownAxeForPage(
      [f(), f({ ruleId: "link-name", title: "Links must have discernible text", severity: "moderate" })],
      page,
    );
    expect(text).toContain("KNOWN AXE VIOLATIONS");
    expect(text).toMatch(/do not re-derive or dispute/i);
    expect(text).toMatch(/already recorded/i);
    expect(text).toContain("color-contrast");
    expect(text).toContain("link-name");
    expect(text).toContain("[serious]");
    expect(text).toContain("[moderate]");
  });

  it("collapses many nodes of the same rule into one line with a count", () => {
    const text = formatKnownAxeForPage([f(), f(), f()], page);
    expect(text).toMatch(/color-contrast:.*\(3 elements\)/);
    expect(text!.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(1);
  });

  it("treats seenOn as the page identity, not just pageUrl", () => {
    const text = formatKnownAxeForPage(
      [f({ pageUrl: other, seenOn: [other, page] })],
      page,
    );
    expect(text).toContain("color-contrast");
  });

  it("does not include page HTML or attacker-controlled snippets", () => {
    const text = formatKnownAxeForPage(
      [f({ title: "Elements must have sufficient color contrast" })],
      page,
    );
    expect(text).not.toMatch(/<script/i);
    expect(text).not.toContain("html");
  });

  it("caps the rule list so a noisy page cannot blow the token budget", () => {
    const many = Array.from({ length: MAX_KNOWN_AXE_RULES + 5 }, (_, i) =>
      f({ ruleId: `rule-${i}`, title: `Rule ${i}` }),
    );
    const text = formatKnownAxeForPage(many, page)!;
    const bullets = text.split("\n").filter((l) => l.startsWith("- ["));
    expect(bullets).toHaveLength(MAX_KNOWN_AXE_RULES);
    expect(text).toMatch(/\+5 more rules omitted/);
  });

  it("does not mutate the input array", () => {
    const findings = [f(), f({ ruleId: "label", title: "Form elements must have labels" })];
    const snapshot = JSON.stringify(findings);
    formatKnownAxeForPage(findings, page);
    expect(JSON.stringify(findings)).toBe(snapshot);
  });
});
