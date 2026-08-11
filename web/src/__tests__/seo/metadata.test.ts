import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf-8");

describe("security.txt (RFC 9116)", () => {
  it("exists with Contact and Expires", () => {
    const txt = read("public/.well-known/security.txt");
    expect(txt).toMatch(/^Contact:/m);
    expect(txt).toMatch(/^Expires:/m);
  });
});

describe("canonical URLs", () => {
  it("home + key pages declare a canonical", () => {
    expect(read("src/app/page.tsx")).toMatch(/canonical:\s*["']\/["']/);
    expect(read("src/app/grade/page.tsx")).toMatch(/canonical:\s*["']\/grade["']/);
    expect(read("src/app/guides/wcag-checklist/page.tsx")).toMatch(
      /canonical:\s*["']\/guides\/wcag-checklist["']/,
    );
  });
});

describe("grade share page metadata", () => {
  const src = read("src/app/grade/[token]/page.tsx");
  it("uses dynamic generateMetadata", () => {
    expect(src).toMatch(/export async function generateMetadata/);
  });
  it("stays noindex — the token URL is a capability link, not an indexable page", () => {
    expect(src).toMatch(/index:\s*false/);
  });
});
