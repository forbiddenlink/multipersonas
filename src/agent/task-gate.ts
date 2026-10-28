import { z } from "zod";
import type { AgentResult } from "./engine.js";
import { runErroredBeforeStart } from "./run-errored.js";

/**
 * CI gating for persona task success (`run`).
 *
 * `run` reports how many personas achieved their goal, but a number printed to a
 * terminal cannot fail a build. This gate works like scan's: against a saved
 * baseline, it fails only when a persona goal that achieved in the baseline no
 * longer achieves.
 *
 * Task success is an observation of whether a goal was reached. It says nothing
 * about accessibility, and the gate never reports it as such.
 *
 * An errored run (no model key, browser or model failure before the first step)
 * is not a task outcome. It is neither a regression nor evidence of a pass, so a
 * baseline-achieved persona that errored makes the gate incomplete (exit 1).
 */

/** Per-run outcome. `errored` is an execution failure and is never persisted in a baseline. */
export type TaskStatus = "achieved" | "blocked" | "errored";

export const taskBaselineSchema = z.object({
  createdAt: z.string().optional(),
  url: z.string().optional(),
  tasks: z.record(z.string(), z.enum(["achieved", "blocked"])),
});

export type TaskBaseline = z.infer<typeof taskBaselineSchema>;

/** The slice of a persona run the gate reads. */
export interface TaskRun {
  persona: { id: string };
  agentResult: AgentResult;
}

export function taskStatusOf(result: AgentResult): TaskStatus {
  if (runErroredBeforeStart(result)) return "errored";
  return result.goalCompleted ? "achieved" : "blocked";
}

export function taskStatuses(runs: TaskRun[]): Record<string, TaskStatus> {
  return Object.fromEntries(runs.map((r) => [r.persona.id, taskStatusOf(r.agentResult)]));
}

/** Snapshot the current outcomes. Errored runs are omitted: they say nothing about the task. */
export function taskBaselineFromResults(runs: TaskRun[], meta: { url?: string; createdAt?: string } = {}): TaskBaseline {
  const tasks: TaskBaseline["tasks"] = {};
  for (const [id, status] of Object.entries(taskStatuses(runs))) {
    if (status !== "errored") tasks[id] = status;
  }
  return { ...meta, tasks };
}

export interface TaskGateResult {
  /** Achieved in the baseline, blocked now. These fail the build. */
  regressed: string[];
  /** Blocked in the baseline, achieved now. Worth reporting, never fails. */
  newlyAchieved: string[];
  /** Every persona whose run errored this time. Not a task outcome. */
  errored: string[];
  /**
   * A persona that achieved in the baseline errored, so the gate cannot say whether
   * it regressed. Neither a pass nor a regression: exit 1.
   */
  incomplete: boolean;
  passed: boolean;
  /** 0 pass, 1 incomplete (could not be decided), 2 regression. */
  exitCode: 0 | 1 | 2;
}

/**
 * Decide the gate. Personas absent from the baseline cannot regress, and baseline
 * personas absent from this run (for example a narrower --personas list) are not judged.
 */
export function evaluateTaskGate(current: Record<string, TaskStatus>, baseline: TaskBaseline): TaskGateResult {
  const regressed: string[] = [];
  const newlyAchieved: string[] = [];
  const errored: string[] = [];
  let incomplete = false;

  for (const [id, status] of Object.entries(current)) {
    const before = baseline.tasks[id];
    if (status === "errored") {
      errored.push(id);
      if (before === "achieved") incomplete = true;
    } else if (before === "achieved" && status === "blocked") {
      regressed.push(id);
    } else if (before === "blocked" && status === "achieved") {
      newlyAchieved.push(id);
    }
  }

  const exitCode = incomplete ? 1 : regressed.length > 0 ? 2 : 0;
  return { regressed, newlyAchieved, errored, incomplete, passed: exitCode === 0, exitCode };
}
