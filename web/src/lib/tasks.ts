import { parseTaskDefinition, parseTaskOutcomes, type TaskDefinition, type TaskOutcome } from "@engine/tasks/definition";
import type { AuditListItem } from "./audits";

export interface TaskSummary {
  task: TaskDefinition;
  outcomes: TaskOutcome[];
  observed: number;
  inconclusive: number;
  complete: boolean;
}

export function summarizeTaskRun(run: AuditListItem): TaskSummary | null {
  const task = parseTaskDefinition(run.task_definition);
  if (!task) return null;
  const outcomes = parseTaskOutcomes(task, run.task_outcomes);
  const ids = new Set(outcomes.map((outcome) => outcome.personaId));
  const complete = run.persona_ids.length > 0 && ids.size === outcomes.length &&
    outcomes.length === run.persona_ids.length && run.persona_ids.every((id) => ids.has(id));
  return {
    task,
    outcomes,
    complete,
    observed: outcomes.filter((outcome) => outcome.evidence.status === "observed").length,
    inconclusive: outcomes.filter((outcome) => outcome.evidence.status === "inconclusive").length,
  };
}

export function taskComparison(current: AuditListItem, previous?: AuditListItem): string {
  const now = summarizeTaskRun(current);
  if (!now) return "This run did not test a saved task.";
  if (!previous) return "First run of this task. Retest after making a change.";
  const before = summarizeTaskRun(previous);
  const sameProfiles = [...current.persona_ids].sort().join(",") === [...previous.persona_ids].sort().join(",");
  if (!before || current.url !== previous.url || !sameProfiles ||
      JSON.stringify(now.task) !== JSON.stringify(before.task)) {
    return "Not compared: the task, starting URL, or selected profiles changed.";
  }
  if (!now.complete || !before.complete || now.inconclusive > 0 || before.inconclusive > 0) {
    return "Not compared: one of these runs has missing or inconclusive task evidence.";
  }
  return `${now.task.version === 2 ? "Configured checks observed" : "Expected text observed"} in ${now.observed} of ${current.persona_ids.length} profiles; previously ${before.observed} of ${previous.persona_ids.length}. This compares browser observations, not human success rates.`;
}

export const TASK_INPUT_ERROR = "Enter a task (10–1000 characters), expected text (3–240 characters), and a valid HTTP(S) destination URL if specified.";
export const TASK_ORIGIN_ERROR = "The expected final URL must use the same protocol, hostname, and port as the project URL.";
