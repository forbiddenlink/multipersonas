import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const robots = fs.readFileSync(path.join(process.cwd(), "public/robots.txt"), "utf8");

describe("robots.txt vs noindex pages", () => {
  // A crawler must be able to fetch a noindex page to see the directive. Pages that carry
  // `robots: { index: false }` must therefore not also be disallowed here.
  it.each(["/grade/", "/r/"])("does not disallow %s, which is served with noindex", (prefix) => {
    const disallowed = robots.split("\n").filter((line) => line.startsWith("Disallow:")).map((line) => line.slice(9).trim());
    expect(disallowed).not.toContain(prefix);
  });

  it.each(["src/app/grade/[token]/page.tsx", "src/app/r/[token]/page.tsx"])("%s declares noindex", (file) => {
    expect(fs.readFileSync(path.join(process.cwd(), file), "utf8")).toMatch(/index:\s*false/);
  });
});
