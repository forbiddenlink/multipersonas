import type { AgentResult } from "./engine.js";

/**
 * The run broke (missing key, model or browser error) before the persona took a step.
 * That is an execution failure, not a task outcome: it must never be counted or shown
 * as a persona that tried and was blocked.
 */
export function runErroredBeforeStart(result: AgentResult): boolean {
  return !result.goalCompleted && result.totalSteps === 0 && (result.scanCoverage?.executionFailures.length ?? 0) > 0;
}
