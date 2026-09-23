import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateText, page, close, send } = vi.hoisted(() => ({
  generateText: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  page: {
    goto: vi.fn(), screenshot: vi.fn(), title: vi.fn(async () => "Synthetic page"),
    waitForTimeout: vi.fn(),
    ariaSnapshot: vi.fn(async () => '- heading "Contact"'),
    url: vi.fn(() => "https://example.com/contact"),
    getByText: vi.fn(),
  },
}));
vi.mock("ai", async (original) => ({ ...await original<typeof import("ai")>(), generateText }));
vi.mock("../security/browser.js", () => ({
  launchAuditBrowser: async () => ({
    close,
    newContext: async () => ({ route: vi.fn(), newPage: async () => page, newCDPSession: async () => ({ send }) }),
  }),
}));
vi.mock("../security/url-guard.js", async (original) => ({
  ...await original<typeof import("../security/url-guard.js")>(),
  assertUrlAllowed: async (url: string) => new URL(url),
}));

import { runPersonaAgent } from "./engine.js";
import { runMultiPersonaTest } from "./orchestrator.js";
import { firstTimeVisitor, keyboardTraversal, mobileSlowConnection } from "../personas/prebuilt.js";
import { personaForTask } from "../tasks/definition.js";

const task = { version: 1 as const, goal: "Find contact information", successText: "Contact our team" };
let directory: string;
beforeEach(() => {
  vi.clearAllMocks();
  directory = mkdtempSync(join(tmpdir(), "mp-task-evidence-"));
  generateText.mockResolvedValue({ text: "I finished", toolCalls: [{
    toolCallId: "finish-1", toolName: "finish", input: { outcome: "achieved", summary: "Claimed success" },
  }] });
  page.getByText.mockReturnValue({ all: async () => [] });
  page.screenshot.mockResolvedValue(undefined);
  send.mockResolvedValue({});
});

describe("browser conditions are wired into persona runs", () => {
  it("applies throttling before the initial navigation", async () => {
    await runPersonaAgent("https://example.com", mobileSlowConnection, directory, { runAxe: false });
    expect(send).toHaveBeenCalledWith("Network.emulateNetworkConditionsByRule", expect.any(Object));
    expect(send.mock.invocationCallOrder.at(-1)).toBeLessThan(page.goto.mock.invocationCallOrder[0]!);
  });

  it("closes the browser and makes no model calls when throttling fails", async () => {
    send.mockRejectedValue(new Error("emulation unavailable"));
    await expect(runPersonaAgent("https://example.com", mobileSlowConnection, directory, { runAxe: false })).rejects.toThrow("emulation unavailable");
    expect(page.goto).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("enforces the profile's keyboard restriction even if a model invents a navigation call", async () => {
    generateText.mockResolvedValueOnce({ toolCalls: [{
      toolCallId: "navigate-1", toolName: "navigate", input: { url: "https://example.com/checkout" },
    }] });
    const result = await runPersonaAgent("https://example.com", keyboardTraversal, directory, {
      runAxe: false, inputModality: "pointer",
    });
    expect(generateText.mock.calls[0]?.[0].tools).not.toHaveProperty("navigate");
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(result.steps[0]?.detail).toContain("Direct navigation is disabled");
  });
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

async function run() {
  return runPersonaAgent("https://example.com/contact", personaForTask(firstTimeVisitor, task), directory, { runAxe: false, task });
}

describe("saved task outcome overrides model claims", () => {
  it("refuses a model's success claim when the expected text is absent", async () => {
    const result = await run();
    expect(result.goalCompleted).toBe(false);
    expect(result.taskEvidence?.status).toBe("not-observed");
    expect(result.steps[result.taskEvidence!.stepIndex!]?.action).toBe("verify_task");
    expect(close).toHaveBeenCalled();
  });
  it("records visible text independently of the model's conclusion", async () => {
    page.getByText.mockReturnValue({ all: async () => [{ isVisible: async () => true, evaluate: async () => false }] });
    generateText.mockResolvedValue({ toolCalls: [{ toolName: "finish", input: { outcome: "blocked", summary: "Uncertain" } }] });
    const result = await run();
    expect(result.goalCompleted).toBe(true);
    expect(result.taskEvidence?.status).toBe("observed");
    expect(result.steps.at(-1)?.screenshotPath).toContain("task-verification.png");
  });
  it("does not mistake a verification failure for success", async () => {
    page.getByText.mockImplementation(() => { throw new Error("browser unavailable"); });
    const result = await run();
    expect(result.goalCompleted).toBe(false);
    expect(result.taskEvidence?.status).toBe("inconclusive");
  });
  it("does not attach old screenshots when the verification frame fails", async () => {
    page.screenshot.mockImplementation(async ({ path }: { path: string }) => {
      if (path.endsWith("task-verification.png")) throw new Error("screenshot unavailable");
    });
    expect((await run()).taskEvidence?.stepIndex).toBeNull();
  });
  it("preserves legacy runs with no saved task", async () => {
    const result = await runPersonaAgent("https://example.com", firstTimeVisitor, directory, { runAxe: false });
    expect(result.goalCompleted).toBe(true);
    expect(result.taskEvidence).toBeUndefined();
    expect(page.getByText).not.toHaveBeenCalled();
  });
});

it("records refused confirmation input rather than implying the input was performed", async () => {
  generateText.mockResolvedValueOnce({ toolCalls: [{
    toolCallId: "type-1", toolName: "type", input: { selector: "Note", text: task.successText },
  }] });
  const result = await runPersonaAgent("https://example.com", firstTimeVisitor, directory, { task, runAxe: false });
  expect(result.steps[0]?.detail).toMatch(/Refused to type the expected confirmation text/);
  expect(result.goalCompleted).toBe(false);
});

it("observes initial text before model actions and persists each configured check", async () => {
  const configured = { ...task, version: 2 as const, requireNewText: true, expectedUrl: "https://example.com/contact" };
  page.getByText.mockReturnValueOnce({ all: async () => [] })
    .mockReturnValue({ all: async () => [{ isVisible: async () => true, evaluate: async () => false }] });
  const result = await runPersonaAgent("https://example.com/contact", firstTimeVisitor, directory, { task: configured, runAxe: false });
  expect(page.getByText.mock.invocationCallOrder[0]).toBeLessThan(generateText.mock.invocationCallOrder[0]!);
  expect(result.taskEvidence).toMatchObject({ status: "observed", checks: { text: "observed", url: "matched", newText: "appeared" } });
});

it("rejects a stale confirmation despite the model claiming success", async () => {
  page.getByText.mockReturnValue({ all: async () => [{ isVisible: async () => true, evaluate: async () => false }] });
  const result = await runPersonaAgent("https://example.com/contact", firstTimeVisitor, directory, {
    task: { ...task, version: 2, requireNewText: true }, runAxe: false,
  });
  expect(result.goalCompleted).toBe(false);
  expect(result.taskEvidence?.checks?.newText).toBe("already-present");
});

it("rejects unreachable cross-origin checks before running any personas", async () => {
  await expect(runMultiPersonaTest({
    url: "https://example.com/contact", personas: [firstTimeVisitor], outputDir: directory, runAxe: false,
    task: { ...task, version: 2, requireNewText: false, expectedUrl: "https://other.example/contact" },
  })).rejects.toThrow("same origin");
  expect(generateText).not.toHaveBeenCalled();
  expect(page.goto).not.toHaveBeenCalled();
});
