import { describe, it, expect } from "vitest";
import { generateMarkdownReport } from "./generator.js";
import { firstTimeVisitor } from "../personas/prebuilt.js";
import type { AgentResult } from "../agent/engine.js";

/**
 * Regression guard for 2026-07-15: a `mark_goal_complete` tool call arrived with
 * no `summary`, so `step.detail` was undefined, and `detail.length` threw at the
 * very last stage of a 9-persona run — destroying ~140 model calls of completed,
 * paid-for work.
 *
 * The renderer takes model-shaped data. It must degrade, never throw.
 */

const step = (over: Partial<AgentResult["steps"][number]> = {}) => ({
  step: 1,
  action: "click",
  detail: "something",
  pageUrl: "https://example.com/x",
  screenshotPath: "/tmp/s.png",
  timestamp: 0,
  ...over,
});

const result = (steps: AgentResult["steps"]): AgentResult => ({
  findings: [],
  steps,
  pagesVisited: ["https://example.com"],
  goalCompleted: true,
  totalSteps: steps.length,
});

const render = (r: AgentResult) =>
  generateMarkdownReport("https://example.com", [
    { persona: firstTimeVisitor, agentResult: r, axeFindings: [] },
  ]);

describe("generateMarkdownReport survives malformed step data", () => {
  it("does not throw when detail is undefined (the actual 2026-07-15 crash)", () => {
    const r = result([step({ detail: undefined as unknown as string })]);
    expect(() => render(r)).not.toThrow();
  });

  it("does not throw when pageUrl is not a valid URL", () => {
    const r = result([step({ pageUrl: "not a url" })]);
    expect(() => render(r)).not.toThrow();
  });

  it("still renders normal steps correctly", () => {
    const out = render(result([step({ detail: "Clicked Sign in" })]));
    expect(out).toMatch(/Clicked Sign in/);
  });

  it("truncates long details rather than exploding", () => {
    const out = render(result([step({ detail: "x".repeat(200) })]));
    expect(out).toMatch(/x{50}\.\.\./);
  });
});
