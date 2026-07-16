import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * `scan` is advertised as keyless — it runs with no ANTHROPIC_API_KEY, which is
 * what makes it safe to drop into CI. That promise is only true if the scan path
 * never imports the LLM. This guards it at the source level, so a future edit
 * that pulls the model into the crawler fails here instead of in someone's CI.
 */
const scanModules = [
  "crawl.ts",
  "gate.ts",
  "../agent/axe-scan.ts",
  "../agent/defect-key.ts",
  "../security/url-guard.ts",
];

describe("scan runs without the LLM", () => {
  for (const rel of scanModules) {
    it(`${rel} does not import the AI SDK`, () => {
      const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
      // Import statements only, and real key access — not prose in a comment.
      expect(src).not.toMatch(/^\s*import[^;\n]*(@ai-sdk|["']ai["'])/m);
      expect(src).not.toMatch(/process\.env\.ANTHROPIC/);
    });
  }
});
