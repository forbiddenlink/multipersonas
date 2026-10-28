import { describe, it, expect } from "vitest";
import type { AgentResult } from "./engine.js";
import { evaluateTaskGate, taskBaselineFromResults, taskStatuses, type TaskBaseline, type TaskStatus } from "./task-gate.js";

function result(opts: { goalCompleted: boolean; totalSteps?: number; failures?: number }): AgentResult {
  return {
    findings: [],
    axeFindings: [],
    steps: [],
    pagesVisited: ["https://example.com/"],
    goalCompleted: opts.goalCompleted,
    totalSteps: opts.totalSteps ?? 5,
    scanCoverage: {
      checks: [],
      executionFailures: Array.from({ length: opts.failures ?? 0 }, () => ({ url: "https://example.com/", error: "boom" })),
    },
  } as AgentResult;
}

const achieved = result({ goalCompleted: true });
const blocked = result({ goalCompleted: false });
const errored = result({ goalCompleted: false, totalSteps: 0, failures: 1 });

const baseline = (tasks: Record<string, "achieved" | "blocked">): TaskBaseline => ({ createdAt: "2026-10-28T00:00:00.000Z", url: "https://example.com/", tasks });
const current = (c: Record<string, TaskStatus>) => c;

describe("evaluateTaskGate", () => {
  it("fails with exit 2 when a goal achieved in the baseline is now blocked", () => {
    const r = evaluateTaskGate(current({ buyer: "blocked", reader: "achieved" }), baseline({ buyer: "achieved", reader: "achieved" }));
    expect(r.regressed).toEqual(["buyer"]);
    expect(r.passed).toBe(false);
    expect(r.incomplete).toBe(false);
    expect(r.exitCode).toBe(2);
  });

  it("passes with exit 0 and lists a goal that newly achieves", () => {
    const r = evaluateTaskGate(current({ buyer: "achieved" }), baseline({ buyer: "blocked" }));
    expect(r.newlyAchieved).toEqual(["buyer"]);
    expect(r.regressed).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.exitCode).toBe(0);
  });

  it("is incomplete with exit 1 when a baseline-achieved persona errored", () => {
    const r = evaluateTaskGate(current({ buyer: "errored", reader: "achieved" }), baseline({ buyer: "achieved", reader: "achieved" }));
    expect(r.errored).toEqual(["buyer"]);
    expect(r.regressed).toEqual([]);
    expect(r.incomplete).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.exitCode).toBe(1);
  });

  it("stays incomplete (exit 1, never 2) when a regression and an errored persona coexist", () => {
    const r = evaluateTaskGate(current({ a: "blocked", b: "errored" }), baseline({ a: "achieved", b: "achieved" }));
    expect(r.regressed).toEqual(["a"]);
    expect(r.incomplete).toBe(true);
    expect(r.exitCode).toBe(1);
  });

  it("ignores an errored persona that is not achieved in the baseline", () => {
    const r = evaluateTaskGate(current({ buyer: "achieved", ghost: "errored", stuck: "errored" }), baseline({ buyer: "achieved", stuck: "blocked" }));
    expect(r.incomplete).toBe(false);
    expect(r.passed).toBe(true);
    expect(r.exitCode).toBe(0);
  });

  it("does not treat a persona new since the baseline as a regression", () => {
    const r = evaluateTaskGate(current({ buyer: "achieved", fresh: "blocked" }), baseline({ buyer: "achieved" }));
    expect(r.regressed).toEqual([]);
    expect(r.newlyAchieved).toEqual([]);
    expect(r.exitCode).toBe(0);
  });

  it("passes against an empty baseline", () => {
    expect(evaluateTaskGate(current({ buyer: "blocked" }), baseline({})).exitCode).toBe(0);
  });
});

describe("taskBaselineFromResults", () => {
  it("records achieved and blocked and omits errored runs", () => {
    const b = taskBaselineFromResults(
      [
        { persona: { id: "buyer" }, agentResult: achieved },
        { persona: { id: "reader" }, agentResult: blocked },
        { persona: { id: "broken" }, agentResult: errored },
      ],
      { url: "https://example.com/", createdAt: "2026-10-28T00:00:00.000Z" },
    );
    expect(b).toEqual({ createdAt: "2026-10-28T00:00:00.000Z", url: "https://example.com/", tasks: { buyer: "achieved", reader: "blocked" } });
    expect("broken" in b.tasks).toBe(false);
  });
});

describe("taskStatuses", () => {
  it("maps results to achieved, blocked and errored", () => {
    expect(
      taskStatuses([
        { persona: { id: "a" }, agentResult: achieved },
        { persona: { id: "b" }, agentResult: blocked },
        { persona: { id: "c" }, agentResult: errored },
      ]),
    ).toEqual({ a: "achieved", b: "blocked", c: "errored" });
  });
});
