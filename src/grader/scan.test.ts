import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// The grader is axe-only and public-only. These source guards keep it that way:
// no model/key, no private-network bypass, no saved session (public pages only).
describe("grader scan source guards", () => {
  const src = readFileSync(new URL("./scan.ts", import.meta.url), "utf8");

  it("never imports the anthropic/model layer", () => {
    expect(src).not.toMatch(/@ai-sdk\/anthropic|generateText|ANTHROPIC/);
  });

  it("never sets allowPrivate to true", () => {
    expect(src).not.toMatch(/allowPrivate:\s*true/);
  });

  it("never loads a session/storageState (public pages only)", () => {
    expect(src).not.toMatch(/storageState|sessionFile/);
  });

  it("guards every in-flight request against SSRF (redirects + subresources)", () => {
    // page.goto follows redirects and pages load subresources, so a pre-nav URL
    // check alone is bypassable. Require the per-request guard to be registered.
    expect(src).toMatch(/context\.route\(/);
    expect(src).toMatch(/assertRequestAllowed/);
  });
});
