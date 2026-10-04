import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  gradesForSite,
  AXE_DOCS_VERSION,
  dequeRuleUrl,
  hostOf,
  linkedInShareUrl,
  regradePath,
  shareText,
  xShareUrl,
} from "@/lib/grade-share";

describe("grade share helpers", () => {
  it("states the measurement honestly, with no compliance wording", () => {
    const text = shareText("example.com", "B");
    expect(text).toBe("example.com scored B on Personaudit's automated accessibility grade");
    expect(text).not.toMatch(/complian|certif|protect/i);
  });

  it("builds encoded LinkedIn and X share URLs", () => {
    const url = "https://personaudit.com/grade/abc";
    expect(linkedInShareUrl(url)).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fpersonaudit.com%2Fgrade%2Fabc",
    );
    const x = new URL(xShareUrl("a b & c", url));
    expect(x.searchParams.get("text")).toBe("a b & c");
    expect(x.searchParams.get("url")).toBe(url);
  });

  it("derives host and re-grade path", () => {
    expect(hostOf("https://example.com/x")).toBe("example.com");
    expect(hostOf("nonsense")).toBe("nonsense");
    expect(regradePath("https://example.com/a?b=1")).toBe("/grade?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1");
  });

  it("links the Deque rule docs for the engine version in use", () => {
    expect(dequeRuleUrl("color-contrast")).toBe(
      `https://dequeuniversity.com/rules/axe/${AXE_DOCS_VERSION}/color-contrast`,
    );
    // Keep the docs version in step with the installed axe-core (root workspace).
    const rootRequire = createRequire(path.resolve(process.cwd(), "../package.json"));
    const playwrightEntry = rootRequire.resolve("@axe-core/playwright");
    const axePkg = createRequire(playwrightEntry).resolve("axe-core/package.json");
    const [major, minor] = (JSON.parse(readFileSync(axePkg, "utf8")) as { version: string }).version.split(".");
    expect(AXE_DOCS_VERSION).toBe(`${major}.${minor}`);
  });
});

describe("gradesForSite", () => {
  const g = (entry_url: string, token: string) => ({ token, entry_url, status: "complete", letter: "B", created_at: "2026-10-01T00:00:00Z" });

  it("keeps grades of the same site, treating www and apex as one site", () => {
    const grades = [g("https://www.acme.test/pricing", "a"), g("https://acme.test/", "b"), g("https://other.test/", "c")];
    expect(gradesForSite(grades, "https://acme.test").map((x) => x.token)).toEqual(["a", "b"]);
  });

  it("does not match a different subdomain or an unparseable project URL", () => {
    const grades = [g("https://shop.acme.test/", "a")];
    expect(gradesForSite(grades, "https://acme.test")).toEqual([]);
    expect(gradesForSite(grades, "not a url")).toEqual([]);
  });
});
