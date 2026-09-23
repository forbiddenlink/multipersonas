import { chromium, type Page } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { verifyTaskText } from "../../src/tasks/verify.js";
import { verifyOriginalTaskText } from "./assertion-baseline.js";

// This measures the text assertion, not model planning, human usability, or a
// competitor's product. Fixtures have independent, predetermined completion state.
interface Case {
  id: string;
  html: string;
  expectedComplete: boolean;
  act?: (page: Page) => Promise<void>;
}
const expectedText = "Request received";
const cases: Case[] = [
  {
    id: "working-action", expectedComplete: true,
    html: `<button onclick="document.body.dataset.complete='true';document.querySelector('output').textContent='Request received'">Continue</button><output></output>`,
    act: (page) => page.getByRole("button", { name: "Continue" }).click(),
  },
  {
    id: "broken-action", expectedComplete: false,
    html: `<button>Continue</button><output></output>`,
    act: (page) => page.getByRole("button", { name: "Continue" }).click(),
  },
  {
    id: "hidden-confirmation", expectedComplete: false,
    html: `<p hidden>Request received</p>`,
  },
  {
    id: "substring-example", expectedComplete: false,
    html: `<p>Request received is only an example, not a confirmation.</p>`,
  },
  {
    id: "stale-confirmation", expectedComplete: false,
    html: `<h1>Previous request</h1><p>Request received</p><button>Continue</button>`,
    act: (page) => page.getByRole("button", { name: "Continue" }).click(),
  },
  {
    id: "editable-echo", expectedComplete: false,
    html: `<label id="note-label">Note</label><div role="textbox" aria-labelledby="note-label" contenteditable="true"></div>`,
    act: (page) => page.getByRole("textbox", { name: "Note" }).fill(expectedText),
  },
  {
    id: "readonly-input-example", expectedComplete: false,
    html: `<label>Example<input value="Request received" readonly></label>`,
  },
  {
    id: "wrong-context-confirmation", expectedComplete: false,
    html: `<h1>Demonstration only</h1><p>Request received</p><p>No request has been sent.</p>`,
  },
];

const output = process.argv[2];
if (!output) throw new Error("Provide an output JSON path.");

const baseline = process.argv.includes("--baseline");
const verify = baseline ? verifyOriginalTaskText : verifyTaskText;
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const rows: { case: string; repeat: number; complete: boolean; observation: string; falseSuccessIfUsedAsCompletion: boolean }[] = [];
try {
  for (const test of cases) {
    for (let repeat = 1; repeat <= 3; repeat++) {
      const context = await browser.newContext();
      try {
        await context.route("**/*", (route) => route.abort());
        const page = await context.newPage();
        await page.setContent(`<!doctype html><html lang="en"><head><title>Assertion fixture</title></head><body data-complete="false"><main>${test.html}</main></body></html>`);
        await test.act?.(page);
        const complete = await page.evaluate(() => document.body.dataset.complete === "true");
        if (complete !== test.expectedComplete) throw new Error(`Fixture oracle mismatch: ${test.id}`);
        const evidence = await verify(page, {
          version: 1, goal: "Complete the synthetic request using Continue", successText: expectedText,
        }, null);
        rows.push({ case: test.id, repeat, complete, observation: evidence.status,
          falseSuccessIfUsedAsCompletion: !complete && evidence.status === "observed" });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
const report = {
  generatedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  workingTreeDirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0,
  browserVersion,
  evaluator: baseline ? "frozen-pre-hardening-reference" : "current-verifier",
  verifierSha256: createHash("sha256").update(readFileSync(new URL(baseline ? "./assertion-baseline.ts" : "../../src/tasks/verify.ts", import.meta.url))).digest("hex"),
  harnessSha256: createHash("sha256").update(readFileSync(new URL(import.meta.url))).digest("hex"),
  scope: "Deterministic task-text assertion only. No model calls, customer pages, or competitor accounts. Actions are scripted; this does not measure agent navigation or business conversion.",
  cases: cases.length, repeats: 3,
  incompleteRuns: rows.filter((row) => !row.complete).length,
  falseSuccessIfUsedAsCompletion: rows.filter((row) => row.falseSuccessIfUsedAsCompletion).length,
  rows,
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ cases: report.cases, runs: rows.length, incompleteRuns: report.incompleteRuns,
  falseSuccessIfUsedAsCompletion: report.falseSuccessIfUsedAsCompletion, output }));
