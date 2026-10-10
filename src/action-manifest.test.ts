import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Guards the distributable GitHub Action manifest (action.yml) — a consumer-facing
 * contract, so a careless edit here breaks every repo that uses `forbiddenlink/multipersonas@v1`.
 */
describe("action.yml (GitHub Action manifest)", () => {
  const manifest = fs.readFileSync(path.join(process.cwd(), "action.yml"), "utf-8");

  it("is a composite action", () => {
    expect(manifest).toMatch(/using:\s*["']composite["']/);
  });

  it("wraps the keyless scan gate via the built CLI", () => {
    expect(manifest).toMatch(/dist\/cli\.js/);
    expect(manifest).toMatch(/\bscan\b/);
    expect(manifest).toMatch(/--fail-on/);
  });

  it("requires a url input and defaults fail-on to serious", () => {
    expect(manifest).toMatch(/url:\s*\n\s*description:/);
    expect(manifest).toMatch(/default:\s*["']serious["']/);
  });

  it("passes inputs through env, never interpolated into the run command (injection-safe)", () => {
    // The URL reaches the shell as $MP_URL, not as a raw ${{ inputs.url }} in run:.
    expect(manifest).toMatch(/MP_URL:\s*\$\{\{\s*inputs\.url\s*\}\}/);
    expect(manifest).not.toMatch(/scan\s+\$\{\{\s*inputs\.url/);
  });

  it("keeps the PR comment opt-in and runs it only on pull_request events", () => {
    expect(manifest).toMatch(/comment:\s*\n\s*description:[^\n]*\n\s*required: false\n\s*default: "false"/);
    expect(manifest).toMatch(/if:.*inputs\.comment == 'true'.*github\.event_name == 'pull_request'/);
    expect(manifest).toMatch(/default: \$\{\{ github\.token \}\}/);
  });

  it("passes the token through env, never interpolated into the run command", () => {
    expect(manifest).toMatch(/GITHUB_TOKEN:\s*\$\{\{\s*inputs\.github-token\s*\}\}/);
    expect(manifest).not.toMatch(/run:.*inputs\.github-token/);
  });

  it("pins third-party actions to a commit SHA", () => {
    for (const line of manifest.split("\n").filter((l) => l.includes("uses:"))) {
      expect(line, line.trim()).toMatch(/@[0-9a-f]{40}\b/);
    }
  });
});
