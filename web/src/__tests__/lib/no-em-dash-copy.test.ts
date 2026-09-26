import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// DESIGN.md bans em dashes in UI copy. Every redesign pass reintroduced them, so the
// rule is enforced here instead of remembered. Comments are stripped first; a lone
// "—" string is allowed because it is the table placeholder for a missing value.
const ROOTS = ["src/app", "src/components", "src/lib"];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx|ts)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("UI copy has no em dashes", () => {
  it("finds none outside comments and the lone placeholder glyph", () => {
    const offenders = ROOTS.flatMap((root) => sourceFiles(path.join(process.cwd(), root)))
      .flatMap((file) =>
        stripComments(fs.readFileSync(file, "utf-8"))
          .split("\n")
          .map((line, i) => ({ file, line: i + 1, text: line }))
          .filter(({ text }) => text.replace(/(["'`])—\1/g, "").includes("—")),
      )
      .map(({ file, line, text }) => `${path.relative(process.cwd(), file)}:${line}  ${text.trim()}`);

    expect(offenders).toEqual([]);
  });
});
