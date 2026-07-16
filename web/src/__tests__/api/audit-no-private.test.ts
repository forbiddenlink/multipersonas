import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The hosted audit endpoint takes a URL from a stranger and lets an LLM that has
 * read the stranger's page choose where to navigate next. `allowPrivate` exists
 * for the CLI (your machine, your site) and must NEVER be set here — doing so
 * reopens the SSRF-to-cloud-metadata chain.
 *
 * This is a source-level guard on purpose: it fails the moment someone types the
 * flag, rather than waiting for a scenario test to happen to cover it.
 */
describe("hosted audit route never permits private targets", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/audit/route.ts"),
    "utf-8",
  );

  it("does not mention allowPrivate at all", () => {
    expect(source).not.toMatch(/allowPrivate/);
  });

  it("calls the URL guard before running the audit", () => {
    expect(source).toMatch(/assertUrlAllowed\(/);
  });
});
