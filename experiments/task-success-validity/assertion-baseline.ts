import type { Page } from "playwright";
import type { TaskDefinition, TaskEvidence } from "../../src/tasks/definition.js";

// Frozen reference matching the pre-hardening verifier's behavior. Retained only
// for reproducible experiments; production must import src/tasks/verify.ts.
export async function verifyOriginalTaskText(
  page: Page,
  task: TaskDefinition,
  stepIndex: number | null,
): Promise<TaskEvidence> {
  try {
    const matches = await page.getByText(task.successText, { exact: true }).all();
    for (const match of matches) {
      if (await match.isVisible()) {
        return { status: "observed", pageUrl: page.url(), stepIndex };
      }
    }
    return { status: "not-observed", pageUrl: page.url(), stepIndex };
  } catch {
    return { status: "inconclusive", pageUrl: page.url(), stepIndex };
  }
}
