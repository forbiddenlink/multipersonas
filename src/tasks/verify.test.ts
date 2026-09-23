import { describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";
import { parseTaskDefinition, personaForTask } from "./definition.js";
import { firstTimeVisitor } from "../personas/prebuilt.js";
import { verifyTaskText } from "./verify.js";

const task = { version: 1 as const, goal: "Find the contact information", successText: "Contact our team" };

function pageWith(visibility: boolean[], editable = false): Page {
  return {
    url: () => "https://example.com/contact",
    getByText: vi.fn(() => ({ all: async () => visibility.map((visible) => ({ isVisible: async () => visible, evaluate: async () => editable })) })),
  } as unknown as Page;
}

describe("saved task evidence", () => {
  it("uses the saved goal without mutating the shared persona or weakening constraints", () => {
    const original = [...firstTimeVisitor.goals];
    const result = personaForTask(firstTimeVisitor, task);
    expect(result.goals[0]).toBe(task.goal);
    expect(result.systemPrompt).toContain(task.goal);
    expect(result.systemPrompt).toContain(task.successText);
    expect(result.systemPrompt).not.toBe(firstTimeVisitor.systemPrompt);
    expect(result.maxSteps).toBe(firstTimeVisitor.maxSteps);
    expect(result.inputModality).toBe(firstTimeVisitor.inputModality);
    expect(firstTimeVisitor.goals).toEqual(original);
  });
  it("normalizes and bounds a task definition", () => {
    expect(parseTaskDefinition({ ...task, goal: `  ${task.goal}  ` })).toEqual(task);
    for (const invalid of [null, [], {}, { ...task, goal: "x" }, { ...task, successText: "x" },
      { ...task, version: 2 }, { ...task, goal: "x".repeat(1001) }, { ...task, successText: "x".repeat(241) },
      { ...task, secret: "unexpected" }]) {
      expect(parseTaskDefinition(invalid)).toBeNull();
    }
  });

  it("requires visible exact text and accepts a visible match after a hidden match", async () => {
    const page = pageWith([false, true]);
    expect(await verifyTaskText(page, task, 3)).toEqual({ status: "observed", pageUrl: page.url(), stepIndex: 3 });
    expect(page.getByText).toHaveBeenCalledWith(task.successText, { exact: true });
  });

  it.each([{ visible: [] }, { visible: [false] }])("does not verify missing or hidden text: %j", async ({ visible }) => {
    const page = pageWith(visible);
    expect((await verifyTaskText(page, task, 0)).status).toBe("not-observed");
  });

  it("records browser failures as inconclusive", async () => {
    const page = pageWith([]);
    vi.mocked(page.getByText).mockImplementation(() => { throw new Error("page closed"); });
    expect((await verifyTaskText(page, task, null)).status).toBe("inconclusive");
  });

  it("does not accept editable text or form values as confirmation evidence", async () => {
    expect((await verifyTaskText(pageWith([true], true), task, null)).status).toBe("not-observed");
  });
});

const contextual = { ...task, version: 2 as const, expectedUrl: "https://example.com/contact", requireNewText: true };
describe("versioned task checks", () => {
  it("preserves legacy definitions and canonicalizes a valid destination", () => {
    expect(parseTaskDefinition(task)).toEqual(task);
    expect(parseTaskDefinition({ ...contextual, expectedUrl: "https://EXAMPLE.com:443/contact" })).toEqual(contextual);
  });
  it.each(["javascript:alert(1)", "/relative", "https://user:password@example.com", "not a url"])("rejects an unsafe or invalid destination: %s", (expectedUrl) => {
    expect(parseTaskDefinition({ ...contextual, expectedUrl })).toBeNull();
  });
  it("rejects version 2 without additional checks", () => {
    expect(parseTaskDefinition({ ...task, version: 2, requireNewText: false })).toBeNull();
  });
  it("requires all configured checks even when exact text is visible", async () => {
    expect(await verifyTaskText(pageWith([true]), contextual, 3, "not-observed")).toMatchObject({ status: "observed", checks: { text: "observed", url: "matched", newText: "appeared" } });
    expect(await verifyTaskText(pageWith([true]), contextual, 3, "observed")).toMatchObject({ status: "not-observed", checks: { newText: "already-present" } });
    expect(await verifyTaskText(pageWith([true]), { ...contextual, expectedUrl: "https://example.com/other" }, 3, "not-observed")).toMatchObject({ status: "not-observed", checks: { url: "mismatched" } });
  });
  it.each([undefined, "inconclusive"] as const)("does not pass without a reliable initial observation: %s", async (initial) => {
    expect((await verifyTaskText(pageWith([true]), contextual, 3, initial)).status).toBe("inconclusive");
  });
  it("allows URL-only checks without an initial observation", async () => {
    expect((await verifyTaskText(pageWith([true]), { ...contextual, requireNewText: false }, null)).status).toBe("observed");
  });
  it("does not accept an editable echo even on the expected URL", async () => {
    expect((await verifyTaskText(pageWith([true], true), contextual, null, "not-observed")).status).toBe("not-observed");
  });
});
