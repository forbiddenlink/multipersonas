import type { Page } from "playwright";
import type { TaskDefinition, TaskEvidence } from "./definition.js";

/** Checks rendered text, never the model's claim. Absence is not proof of a site defect. */
async function observeTaskText(
  page: Page,
  task: TaskDefinition,
  stepIndex: number | null,
): Promise<TaskEvidence> {
  try {
    const matches = await page.getByText(task.successText, { exact: true }).all();
    for (const match of matches) {
      const isInput = await match.evaluate((element) =>
        (element instanceof HTMLElement && element.isContentEditable) ||
        element.closest("input, textarea, select") !== null, undefined, { timeout: 1_000 });
      if (!isInput && await match.isVisible()) {
        return { status: "observed", pageUrl: page.url(), stepIndex };
      }
    }
    return { status: "not-observed", pageUrl: page.url(), stepIndex };
  } catch {
    return { status: "inconclusive", pageUrl: page.url(), stepIndex };
  }
}


/** All configured checks must pass; these are browser observations, not transaction proof. */
export async function verifyTaskText(
  page: Page,
  task: TaskDefinition,
  stepIndex: number | null,
  initialTextStatus?: TaskEvidence["status"],
): Promise<TaskEvidence> {
  const text = await observeTaskText(page, task, stepIndex);
  if (task.version === 1) return text;
  let url: NonNullable<TaskEvidence["checks"]>["url"] = "not-required";
  if (task.expectedUrl) {
    try { url = new URL(text.pageUrl).href === task.expectedUrl ? "matched" : "mismatched"; }
    catch { url = "inconclusive"; }
  }
  let newText: NonNullable<TaskEvidence["checks"]>["newText"] = "not-required";
  if (task.requireNewText) {
    newText = !initialTextStatus || initialTextStatus === "inconclusive" || text.status === "inconclusive"
      ? "inconclusive"
      : initialTextStatus === "observed" ? "already-present"
      : text.status === "observed" ? "appeared" : "not-observed";
  }
  const status = text.status === "inconclusive" || url === "inconclusive" || newText === "inconclusive"
    ? "inconclusive"
    : text.status === "observed" && url !== "mismatched" && !["already-present", "not-observed"].includes(newText)
      ? "observed" : "not-observed";
  return { ...text, status, checks: { text: text.status, url, newText } };
}
