import { describe, expect, it } from "vitest";
import { summarizeTaskRun, taskComparison } from "./tasks";
import type { AuditListItem } from "./audits";

const task = { version: 1, goal: "Find contact information", successText: "Contact our team" };
function run(observed: boolean): AuditListItem {
  return {
    id: "run-1", url: "https://example.com", created_at: "2026-09-18",
    persona_ids: ["first-time-visitor"], task_success_total: 1, task_success_achieved: observed ? 1 : 0,
    task_definition: task,
    task_outcomes: [{ personaId: "first-time-visitor", evidence: {
      status: observed ? "observed" : "not-observed", pageUrl: "https://example.com/contact", stepIndex: 2,
    } }],
  };
}

describe("task retests", () => {
  it("compares observed evidence for the same task and conditions", () => {
    expect(taskComparison(run(true), run(false))).toContain("1 of 1 profiles; previously 0 of 1");
  });
  it("does not use the old model success total as task evidence", () => {
    expect(summarizeTaskRun({ ...run(false), task_success_achieved: 1 })?.observed).toBe(0);
  });
  it.each([
    { task_definition: { ...task, goal: "Find another service" } },
    { task_definition: { ...task, successText: "Different text" } },
    { url: "https://example.com/other" },
    { persona_ids: ["mobile-user"] },
    { task_definition: null },
  ])("refuses comparisons across changed conditions: %j", (change) => {
    expect(taskComparison(run(true), { ...run(false), ...change })).toContain("Not compared");
  });
  it("does not present browser errors or missing evidence as a regression", () => {
    const failed = run(false);
    failed.task_outcomes = [{ personaId: "first-time-visitor", evidence: {
      status: "inconclusive", pageUrl: failed.url, stepIndex: null,
    } }];
    expect(taskComparison(failed, run(true))).toContain("inconclusive");
    expect(taskComparison({ ...run(true), task_outcomes: [] }, run(true))).toContain("missing");
  });
  it("rejects duplicate or mismatched profile evidence", () => {
    const current = run(true);
    current.persona_ids = ["first-time-visitor", "mobile-user"];
    current.task_outcomes = [...(current.task_outcomes as []), ...(current.task_outcomes as [])];
    expect(summarizeTaskRun(current)?.complete).toBe(false);
  });
  it("recognizes a first run and legacy runs", () => {
    expect(taskComparison(run(true))).toContain("First run");
    expect(summarizeTaskRun({ ...run(true), task_definition: null })).toBeNull();
  });
});

it("refuses comparisons when stronger checks change or their evidence is absent", () => {
  const stronger = { ...task, version: 2, requireNewText: true };
  expect(taskComparison({ ...run(true), task_definition: stronger }, run(true))).toContain("changed");
  const current = { ...run(true), task_definition: stronger };
  expect(summarizeTaskRun(current)?.complete).toBe(false);
  expect(taskComparison(current, current)).toContain("missing");
});
