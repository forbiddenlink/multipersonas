import { generateText, tool, type ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { chromium, type Browser, type Page } from "playwright";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import type { Persona } from "../personas/types.js";

// --- Types ---

export interface Finding {
  severity: "critical" | "serious" | "moderate" | "minor";
  category: "accessibility" | "usability" | "performance" | "content";
  title: string;
  description: string;
  recommendation: string;
  pageUrl: string;
  screenshotPath?: string;
}

export interface StepRecord {
  step: number;
  action: string;
  detail: string;
  pageUrl: string;
  screenshotPath: string;
  timestamp: number;
}

export interface AgentResult {
  findings: Finding[];
  steps: StepRecord[];
  pagesVisited: string[];
  goalCompleted: boolean;
  totalSteps: number;
}

// --- Snapshot helpers ---

function truncateSnapshot(snapshot: string, maxChars: number = 4000): string {
  if (snapshot.length <= maxChars) return snapshot;
  return snapshot.slice(0, maxChars) + "\n... [truncated]";
}

// --- Element resolution ---

async function resolveElement(
  page: Page,
  selector: string
): ReturnType<Page["getByRole"]> extends infer R ? Promise<Awaited<R>> : never {
  // Try getByRole with common roles
  const roles = [
    "button",
    "link",
    "textbox",
    "checkbox",
    "radio",
    "tab",
    "menuitem",
    "heading",
    "combobox",
    "option",
    "listitem",
  ] as const;

  for (const role of roles) {
    const byRole = page.getByRole(role, { name: selector });
    if ((await byRole.count()) > 0) return byRole.first();
  }

  // Try getByLabel
  const byLabel = page.getByLabel(selector);
  if ((await byLabel.count()) > 0) return byLabel.first();

  // Try getByText (exact then partial)
  const byTextExact = page.getByText(selector, { exact: true });
  if ((await byTextExact.count()) > 0) return byTextExact.first();

  const byTextPartial = page.getByText(selector);
  if ((await byTextPartial.count()) > 0) return byTextPartial.first();

  // Try getByPlaceholder
  const byPlaceholder = page.getByPlaceholder(selector);
  if ((await byPlaceholder.count()) > 0) return byPlaceholder.first();

  // Fallback to CSS/XPath locator
  const byLocator = page.locator(selector);
  if ((await byLocator.count()) > 0) return byLocator.first();

  throw new Error(
    `Could not find element matching "${selector}". Try a different selector based on the accessibility tree.`
  );
}

// --- Tool definitions ---

const agentTools = {
  click: tool({
    description:
      "Click an element on the page. Use the accessibility name or role text from the page snapshot.",
    inputSchema: z.object({
      selector: z
        .string()
        .describe("Accessibility name or role text of the element to click"),
    }),
  }),
  type: tool({
    description:
      "Type text into an input field. Use the accessibility name or label of the input.",
    inputSchema: z.object({
      selector: z
        .string()
        .describe("Accessibility name or label of the input field"),
      text: z.string().describe("Text to type into the field"),
    }),
  }),
  scroll: tool({
    description: "Scroll the page up or down to reveal more content.",
    inputSchema: z.object({
      direction: z.enum(["up", "down"]).describe("Direction to scroll"),
    }),
  }),
  navigate: tool({
    description: "Navigate to a specific URL.",
    inputSchema: z.object({
      url: z.string().describe("The URL to navigate to"),
    }),
  }),
  report_finding: tool({
    description:
      "Report a UX, accessibility, or usability issue you have found on the page.",
    inputSchema: z.object({
      severity: z
        .enum(["critical", "serious", "moderate", "minor"])
        .describe("How severe the issue is"),
      category: z
        .enum(["accessibility", "usability", "performance", "content"])
        .describe("Category of the issue"),
      title: z.string().describe("Short title summarizing the issue"),
      description: z
        .string()
        .describe("Detailed description of what is wrong"),
      recommendation: z
        .string()
        .describe("How the issue should be fixed"),
    }),
  }),
  mark_goal_complete: tool({
    description:
      "Mark your current goal as achieved and provide a summary of what you accomplished.",
    inputSchema: z.object({
      summary: z.string().describe("Summary of what was accomplished"),
    }),
  }),
};

// --- Action executor ---

async function executeAction(
  page: Page,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  const ACTION_TIMEOUT = 10_000;

  switch (toolName) {
    case "click": {
      const el = await resolveElement(page, input.selector as string);
      await el.click({ timeout: ACTION_TIMEOUT });
      return `Clicked "${input.selector}"`;
    }
    case "type": {
      const el = await resolveElement(page, input.selector as string);
      await el.fill(input.text as string, { timeout: ACTION_TIMEOUT });
      return `Typed "${input.text}" into "${input.selector}"`;
    }
    case "scroll": {
      const distance = input.direction === "down" ? 600 : -600;
      await page.evaluate((d: number) => window.scrollBy(0, d), distance);
      return `Scrolled ${input.direction as string}`;
    }
    case "navigate": {
      await page.goto(input.url as string, {
        timeout: ACTION_TIMEOUT,
        waitUntil: "domcontentloaded",
      });
      return `Navigated to ${input.url as string}`;
    }
    case "report_finding": {
      return `Finding reported: ${input.title as string}`;
    }
    case "mark_goal_complete": {
      return `Goal marked complete: ${input.summary as string}`;
    }
    default:
      return `Unknown action: ${toolName}`;
  }
}

// --- Page context snapshot ---

async function getPageContext(page: Page): Promise<string> {
  const title = await page.title();
  const url = page.url();
  let snapshot: string;

  try {
    const tree = await page.locator("body").ariaSnapshot();
    snapshot = truncateSnapshot(tree);
  } catch {
    snapshot = "(accessibility snapshot unavailable)";
  }

  return [
    `Current URL: ${url}`,
    `Page Title: ${title}`,
    "",
    "Accessibility Tree:",
    snapshot,
  ].join("\n");
}

// --- Stuck detection ---

function isStuck(
  steps: StepRecord[],
  repeatThreshold: number = 3
): boolean {
  if (steps.length < repeatThreshold) return false;
  const recent = steps.slice(-repeatThreshold);
  const first = `${recent[0].action}:${recent[0].detail}`;
  return recent.every((s) => `${s.action}:${s.detail}` === first);
}

// --- Main agent loop ---

export async function runPersonaAgent(
  url: string,
  persona: Persona,
  outputDir: string
): Promise<AgentResult> {
  const screenshotDir = path.join(outputDir, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const findings: Finding[] = [];
  const steps: StepRecord[] = [];
  const pagesVisited = new Set<string>();
  let goalCompleted = false;

  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: persona.viewport,
      userAgent: persona.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        : undefined,
      isMobile: persona.isMobile,
    });
    const page = await context.newPage();

    // Navigate to target
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    pagesVisited.add(page.url());

    // Take initial screenshot
    const initialScreenshot = path.join(screenshotDir, "step-000.png");
    await page.screenshot({ path: initialScreenshot, fullPage: false });

    // Build conversation messages
    const messages: ModelMessage[] = [];

    for (let step = 1; step <= persona.maxSteps; step++) {
      const pageContext = await getPageContext(page);
      pagesVisited.add(page.url());

      // Build the user message for this step
      let userContent = `Step ${step}/${persona.maxSteps}\n\n${pageContext}`;

      if (isStuck(steps)) {
        userContent +=
          "\n\nYou seem stuck -- you've performed the same action 3 times in a row. Try a different approach.";
      }

      messages.push({ role: "user", content: userContent });

      const result = await generateText({
        model: anthropic(process.env.MULTIPERSONAS_MODEL || "claude-sonnet-4-20250514"),
        system: persona.systemPrompt,
        messages,
        tools: agentTools,
        maxOutputTokens: 1024,
        toolChoice: "required",
      });

      // Extract the tool call from the response
      const toolCall = result.toolCalls[0];
      if (!toolCall) {
        // LLM didn't call a tool -- add its text and continue
        messages.push({
          role: "assistant",
          content: result.text || "No action taken.",
        });
        continue;
      }

      const toolName = toolCall.toolName;
      const input = toolCall.input as Record<string, unknown>;

      // Record assistant message with the tool call
      messages.push({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input,
          },
        ],
      });

      // Handle report_finding
      if (toolName === "report_finding") {
        const f = input as unknown as {
          severity: Finding["severity"];
          category: Finding["category"];
          title: string;
          description: string;
          recommendation: string;
        };
        const screenshotPath = path.join(
          screenshotDir,
          `step-${String(step).padStart(3, "0")}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });

        findings.push({
          ...f,
          pageUrl: page.url(),
          screenshotPath,
        });

        steps.push({
          step,
          action: "report_finding",
          detail: f.title,
          pageUrl: page.url(),
          screenshotPath,
          timestamp: Date.now(),
        });

        // Tell the LLM the finding was recorded via a tool result
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: toolCall.toolCallId,
              toolName,
              output: { type: "text" as const, value: `Finding recorded: "${f.title}". Continue browsing.` },
            },
          ],
        });
        continue;
      }

      // Handle mark_goal_complete
      if (toolName === "mark_goal_complete") {
        goalCompleted = true;
        const screenshotPath = path.join(
          screenshotDir,
          `step-${String(step).padStart(3, "0")}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });

        steps.push({
          step,
          action: "mark_goal_complete",
          detail: (input as { summary: string }).summary,
          pageUrl: page.url(),
          screenshotPath,
          timestamp: Date.now(),
        });
        break;
      }

      // Execute browser action
      let actionResult: string;
      const screenshotPath = path.join(
        screenshotDir,
        `step-${String(step).padStart(3, "0")}.png`
      );

      try {
        actionResult = await executeAction(page, toolName, input);
        // Wait briefly for page to settle after action
        await page.waitForTimeout(500);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        actionResult = `Action failed: ${errMsg}`;
        try {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        } catch {
          // Screenshot also failed, continue without it
        }
      }

      pagesVisited.add(page.url());

      const detail =
        toolName === "navigate"
          ? String(input.url)
          : toolName === "click"
            ? String(input.selector)
            : toolName === "type"
              ? `${String(input.selector)}: "${String(input.text)}"`
              : toolName === "scroll"
                ? String(input.direction)
                : JSON.stringify(input);

      steps.push({
        step,
        action: toolName,
        detail,
        pageUrl: page.url(),
        screenshotPath,
        timestamp: Date.now(),
      });

      // Feed the result back as a tool result message
      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: toolCall.toolCallId,
            toolName,
            output: { type: "text" as const, value: actionResult },
          },
        ],
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return {
    findings,
    steps,
    pagesVisited: [...pagesVisited],
    goalCompleted,
    totalSteps: steps.length,
  };
}
