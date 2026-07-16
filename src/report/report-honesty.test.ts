import { describe, it, expect } from "vitest";
import { generateMarkdownReport, groupAxeByRule } from "./generator.js";
import type { Finding, AgentResult } from "../agent/engine.js";
import type { Persona } from "../personas/types.js";

/**
 * The report is the product, so these pin what it is not allowed to say.
 * Both rules come from real defects found by dogfooding on 2026-07-16.
 */
const persona = (id: string): Persona =>
  ({ id, name: id, description: "d", maxSteps: 20, goals: [], frustrations: [] }) as unknown as Persona;

const result = (over: Partial<AgentResult> = {}): AgentResult => ({
  findings: [],
  axeFindings: [],
  steps: [],
  pagesVisited: ["https://x.test/"],
  goalCompleted: false,
  totalSteps: 3,
  ...over,
});

const axe: Finding = {
  severity: "critical",
  category: "accessibility",
  title: "ARIA roles must conform",
  description: "d",
  recommendation: "r",
  pageUrl: "https://x.test/a",
  ruleId: "aria-roles",
  target: "div.x",
  seenOn: ["https://x.test/a", "https://x.test/b"],
};

describe("the report must not inflate what it found", () => {
  it("does not multiply shared axe defects by the number of personas", () => {
    // Was: 8 axe findings x 3 personas + 6 UX = "30 issues" where 14 existed.
    const md = generateMarkdownReport(
      "https://x.test",
      [persona("a"), persona("b"), persona("c")].map((p) => ({ persona: p, agentResult: result() })),
      [axe],
    );
    // One defect, reported once, in the summary row.
    expect(md).toMatch(/\|\s*\*\*0\/3 personas\*\*\s*\|\s*1\s*\|\s*1\s*\|\s*0\s*\|/);
    expect(md.match(/ARIA roles must conform/g)).toHaveLength(1);
  });

  it("leads with task success rather than an invented score", () => {
    const md = generateMarkdownReport("https://x.test", [
      { persona: persona("a"), agentResult: result({ goalCompleted: true }) },
      { persona: persona("b"), agentResult: result({ goalCompleted: false }) },
    ]);
    expect(md).toContain("**1/2 personas**");
    // The old composite is gone and must not creep back.
    expect(md).not.toMatch(/\/100/);
    expect(md).not.toMatch(/Overall Score/i);
  });

  it("separates deterministic defects from AI judgement", () => {
    const md = generateMarkdownReport(
      "https://x.test",
      [{ persona: persona("a"), agentResult: result({ findings: [{ ...axe, category: "usability", title: "Confusing nav", ruleId: undefined, target: undefined, seenOn: undefined }] }) }],
      [axe],
    );
    expect(md).toContain("Accessibility defects");
    expect(md).toMatch(/UX observations.*AI judgement/);
    expect(md).toContain("not a verdict");
  });

  it("says where a defect was seen, so the fix can be checked", () => {
    const md = generateMarkdownReport("https://x.test", [{ persona: persona("a"), agentResult: result() }], [axe]);
    expect(md).toContain("Seen in 2 states");
    expect(md).toContain("`aria-roles`");
  });

  it("calls out when nobody succeeded, rather than burying it", () => {
    const md = generateMarkdownReport("https://x.test", [{ persona: persona("a"), agentResult: result({ goalCompleted: false }) }]);
    expect(md).toContain("No persona finished what they came to do");
  });

  it("still renders when the model omitted fields", () => {
    const broken = { title: "x", pageUrl: "https://x.test/" } as unknown as Finding;
    expect(() =>
      generateMarkdownReport("https://x.test", [{ persona: persona("a"), agentResult: result({ findings: [broken] }) }], [broken]),
    ).not.toThrow();
  });
});

describe("groupAxeByRule — count problems, not elements", () => {
  const el = (ruleId: string, target: string, url: string, severity: Finding["severity"] = "serious"): Finding => ({
    severity, category: "accessibility", title: `${ruleId} title`, description: "d",
    recommendation: "r", pageUrl: url, ruleId, target, seenOn: [url],
  });

  it("collapses one rule matching many elements into one defect", () => {
    // Real run: 27 color-contrast rows. That is 1 problem, not 27.
    const group = groupAxeByRule(
      Array.from({ length: 27 }, (_, i) => el("color-contrast", `.cell-${i}`, "https://x.test/t")),
    );
    expect(group).toHaveLength(1);
    expect(group[0]!.elements).toHaveLength(27);
  });

  it("keeps different rules apart and orders by severity", () => {
    const groups = groupAxeByRule([
      el("color-contrast", ".a", "https://x.test/", "serious"),
      el("aria-roles", ".b", "https://x.test/", "critical"),
    ]);
    expect(groups.map((g) => g.ruleId)).toEqual(["aria-roles", "color-contrast"]);
  });

  it("unions the states a rule was seen in", () => {
    const groups = groupAxeByRule([
      el("link-name", ".a", "https://x.test/one"),
      el("link-name", ".b", "https://x.test/two"),
    ]);
    expect(groups[0]!.seenOn).toEqual(["https://x.test/one", "https://x.test/two"]);
  });

  it("headline counts defects, not affected elements", () => {
    const many = Array.from({ length: 27 }, (_, i) => el("color-contrast", `.c${i}`, "https://x.test/"));
    const md = generateMarkdownReport("https://x.test", [{ persona: persona("a"), agentResult: result() }], many);
    expect(md).toContain("**1 defects** across 27 elements");
    expect(md).not.toMatch(/\|\s*27\s*\|\s*0\s*\|/); // 27 must never be the summary count
  });
});
