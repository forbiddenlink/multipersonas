import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf-8");

describe("hero", () => {
  const home = read("src/app/page.tsx");
  it("puts the grade form in the hero and keeps a closing grade CTA", () => {
    // The hero field posts to /api/grade through GradeForm; the closing CTA focuses it.
    expect(home).toMatch(/<GradeForm \/>/);
    expect(home).toMatch(/<FocusGradeLink[\s\S]{0,700}Grade a site free/);
  });
  it("reads the price from the plan catalogue, not a literal", () => {
    expect(home).toMatch(/PLANS\.solo\.monthlyUsd/);
    expect(home).toMatch(/SOLO_OPEN\s*\?/);
  });
  it("names the Solo price in the closing copy only when checkout is open", () => {
    expect(home).not.toMatch(/Solo is \$39/);
    expect(home).toMatch(/SOLO_OPEN\s*\? `[^`]*\$\$\{PLANS\.solo\.monthlyUsd\}/);
  });
});

describe("grade result page", () => {
  const page = read("src/app/grade/[token]/page.tsx");
  it("marks the printable root and hides chrome and calls to action in print", () => {
    expect(page).toMatch(/grade-print-root/);
    expect(page.match(/grade-print-hide/g)?.length).toBeGreaterThanOrEqual(2);
    expect(page).toMatch(/grade-print-meta/);
  });
  it("prints on white paper with the graded URL line", () => {
    const css = read("src/app/globals.css");
    const print = css.slice(css.indexOf(".grade-print-meta"));
    expect(print).toMatch(/@media print/);
    expect(print).toMatch(/--background:\s*#ffffff/);
    // The verdict stamp reads --primary; dark mode's pale value would print unreadable.
    expect(print).toMatch(/--primary:\s*oklch\(0\.38 0\.13 264\)/);
    expect(print).toMatch(/\.grade-print-root > header/);
    expect(print).toMatch(/\.grade-print-root > footer/);
  });
});

describe("route titles and headings", () => {
  it("gives the password pages their own title", () => {
    expect(read("src/app/auth/forgot-password/layout.tsx")).toMatch(/title:\s*"Reset your password"/);
    expect(read("src/app/auth/update-password/layout.tsx")).toMatch(/title:\s*"Set a new password"/);
  });
  it("titles both not-found pages and gives the grade one an h1", () => {
    expect(read("src/app/not-found.tsx")).toMatch(/title:\s*"Page not found"/);
    const grade = read("src/app/grade/[token]/not-found.tsx");
    expect(grade).toMatch(/title:\s*"Case file not found"/);
    expect(grade).toMatch(/<h1 /);
  });
});

describe("report tables", () => {
  it("are keyboard-focusable and named, since they scroll sideways on phones", () => {
    const src =
      read("src/app/(app)/audits/[id]/report/report-document.tsx") +
      read("src/app/(app)/audits/[id]/report/conformance-table.tsx");
    const tables = src.match(/<table className=\{styles\.table\}[^>]*>/g) ?? [];
    expect(tables.length).toBe(4);
    for (const t of tables) {
      expect(t).toMatch(/tabIndex=\{0\}/);
      expect(t).toMatch(/aria-label="/);
    }
  });
});
