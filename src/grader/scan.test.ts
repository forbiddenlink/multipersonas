import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("counts WCAG 2.0/2.1/2.2 A+AA tags (not only wcag2a/aa)", () => {
    expect(src).toMatch(/wcag21aa/);
    expect(src).toMatch(/wcag22aa/);
    // Best-practice is not a WCAG success criterion — must stay out of AA_TAGS.
    expect(src).not.toMatch(/AA_TAGS = new Set\(\[[^\]]*best-practice/);
  });
});

// Exercise failure behavior without a browser, network access, or model calls.
const mocks = vi.hoisted(() => ({
  goto: vi.fn(), analyze: vi.fn(), links: vi.fn(), close: vi.fn(),
  allowed: vi.fn(), currentUrl: "https://public.example/",
}));
vi.mock("../security/browser.js", () => ({ launchAuditBrowser: async () => ({
  newContext: async () => ({
    route: async () => {},
    newPage: async () => ({
      goto: mocks.goto, waitForTimeout: async () => {},
      url: () => mocks.currentUrl, $$eval: mocks.links,
    }),
  }),
  close: mocks.close,
}) }));
vi.mock("../security/url-guard.js", () => ({
  assertUrlAllowed: async (url: string) => new URL(url),
  isUrlAllowed: mocks.allowed, assertRequestAllowed: async () => true,
}));
vi.mock("@axe-core/playwright", () => ({ AxeBuilder: class {
  analyze = mocks.analyze;
} }));
import { gradeScan } from "./scan.js";

describe("grader evidence failures", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUrl = "https://public.example/";
    mocks.allowed.mockResolvedValue(true);
    mocks.goto.mockImplementation(async (url: string) => {
      mocks.currentUrl = url;
      return { ok: () => true };
    });
    mocks.analyze.mockResolvedValue({ violations: [], passes: [{ id: "html-has-lang" }] });
    mocks.links.mockResolvedValue([]);
  });

  it("fails instead of issuing a grade when no page loads", async () => {
    mocks.goto.mockRejectedValue(new Error("navigation failed"));
    await expect(gradeScan(mocks.currentUrl)).rejects.toThrow("No public pages could be evaluated");
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it.each([null, { ok: () => false }])("does not grade a missing or unsuccessful HTTP response", async (response) => {
    mocks.goto.mockResolvedValue(response);
    await expect(gradeScan(mocks.currentUrl)).rejects.toThrow("No public pages could be evaluated");
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("does not award an A when axe found no passed or failed checks", async () => {
    mocks.analyze.mockResolvedValue({ violations: [], passes: [], incomplete: [{ id: "color-contrast" }] });
    await expect(gradeScan(mocks.currentUrl)).rejects.toThrow("No public pages could be evaluated");
  });

  it("retains failed and unvisited URLs without grading an error page", async () => {
    const root = mocks.currentUrl;
    const unavailable = `${root}unavailable`;
    const healthy = `${root}healthy`;
    const remaining = `${root}remaining`;
    mocks.links.mockResolvedValueOnce([unavailable, healthy, remaining]);
    mocks.goto.mockImplementation(async (url: string) => {
      mocks.currentUrl = url;
      return { ok: () => url !== unavailable };
    });
    const result = await gradeScan(root, { maxPages: 2 });
    expect(result.pagesVisited).toEqual([root, healthy]);
    expect(result.report.pagesScanned).toBe(2);
    expect(result.skipped).toEqual([unavailable, remaining]);
    expect(result.report.coverage).toEqual({ pageLimit: 2, skippedPages: 2 });
    expect(mocks.analyze).toHaveBeenCalledTimes(2);
  });

  it("retains navigation failures and blocked URLs in skipped scope", async () => {
    const root = mocks.currentUrl;
    const timeout = `${root}timeout`;
    const blocked = `${root}blocked`;
    mocks.links.mockResolvedValueOnce([timeout, blocked]);
    mocks.goto.mockImplementation(async (url: string) => {
      if (url === timeout) throw new Error("Timeout");
      mocks.currentUrl = url;
      return { ok: () => true };
    });
    mocks.allowed.mockImplementation(async (url: string) => url !== blocked);
    const result = await gradeScan(root);
    expect(result.pagesVisited).toEqual([root]);
    expect(result.skipped).toEqual([timeout, blocked]);
  });

  it("still grades successful public content and closes the browser", async () => {
    const result = await gradeScan(mocks.currentUrl);
    expect(result.report).toMatchObject({ grade: "A", pagesScanned: 1 });
    expect(result.skipped).toEqual([]);
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("scans pages under the entered path before the rest of the site", async () => {
    const root = "https://public.example/demos/bad/";
    mocks.currentUrl = root;
    const home = "https://public.example/";
    const sibling = "https://public.example/demos/badge";
    const before = `${root}before.html`;
    const after = `${root}after/home.html`;
    mocks.links.mockResolvedValueOnce([home, sibling, before, after]);
    const result = await gradeScan(root, { maxPages: 3 });
    expect(result.pagesVisited).toEqual([root, before, after]);
    expect(result.skipped).toEqual([home, sibling]);
  });

  it("fills spare page slots with the rest of the site after the entered path", async () => {
    const root = "https://public.example/demos/bad/";
    mocks.currentUrl = root;
    const home = "https://public.example/";
    const before = `${root}before.html`;
    mocks.links.mockResolvedValueOnce([home, before]);
    const result = await gradeScan(root, { maxPages: 3 });
    expect(result.pagesVisited).toEqual([root, before, home]);
  });

  it("does not re-scan the same page through an in-page anchor", async () => {
    const root = mocks.currentUrl;
    const skipLink = `${root}#main`;
    const other = `${root}other`;
    mocks.links.mockResolvedValueOnce([skipLink, other]);
    const result = await gradeScan(root);
    expect(result.pagesVisited).toEqual([root, other]);
  });

  it("preserves hash-route states when navigation retains a successfully loaded document", async () => {
    const root = mocks.currentUrl;
    const route = `${root}#/contact`;
    mocks.links.mockResolvedValueOnce([route]);
    mocks.goto.mockImplementation(async (url: string) => {
      mocks.currentUrl = url;
      return url === root ? { ok: () => true } : null;
    });
    const result = await gradeScan(root);
    expect(result.pagesVisited).toEqual([root, route]);
    expect(result.skipped).toEqual([]);
  });
});

describe("grader finding examples", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUrl = "https://public.example/";
    mocks.allowed.mockResolvedValue(true);
    mocks.goto.mockImplementation(async (url: string) => {
      mocks.currentUrl = url;
      return { ok: () => true };
    });
    mocks.links.mockResolvedValue([]);
  });

  it("keeps up to three located elements per rule with selector, page and capped HTML", async () => {
    const long = `<img src="/a.png" class="${"x".repeat(400)}">`;
    mocks.analyze.mockResolvedValue({
      passes: [{ id: "html-has-lang" }],
      violations: [{
        id: "image-alt", impact: "critical", help: "Images must have alternate text", tags: ["wcag2a"],
        nodes: [
          { target: ["main > img:nth-child(1)"], html: long },
          { target: [["#host", "img.inner"]], html: "<img>" },
          { target: ["img.c"], html: "<img class=\"c\">" },
          { target: ["img.d"], html: "<img class=\"d\">" },
        ],
      }],
    });
    const { report } = await gradeScan(mocks.currentUrl);
    expect(report.rules).toMatchObject([{ id: "image-alt", nodes: 4 }]);
    const examples = report.rules.at(0)?.examples ?? [];
    expect(examples).toMatchObject([
      { target: "main > img:nth-child(1)", url: "https://public.example/" },
      // Shadow-DOM targets are nested arrays; flatten them into one readable path.
      { target: "#host >>> img.inner" },
      { target: "img.c" },
    ]);
    const firstHtml = examples.at(0)?.html ?? "";
    expect(firstHtml.length).toBeLessThanOrEqual(240);
    expect(firstHtml.endsWith("\u2026")).toBe(true);
  });
});

describe("grader cross-page evidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUrl = "https://public.example/";
    mocks.allowed.mockResolvedValue(true);
    mocks.goto.mockImplementation(async (url: string) => {
      mocks.currentUrl = url;
      return { ok: () => true };
    });
    mocks.links.mockResolvedValue([]);
  });

  it("records a selector repeated on two pages as a shared target and counts the pages", async () => {
    const root = mocks.currentUrl;
    mocks.links.mockResolvedValueOnce([`${root}about`]);
    mocks.analyze.mockResolvedValue({
      passes: [{ id: "html-has-lang" }],
      violations: [{
        id: "button-name", impact: "critical", help: "Buttons must have discernible text", tags: ["wcag2a"],
        nodes: [{ target: ["header .menu-btn"], html: "<button>" }, { target: ["#only-here"], html: "<button>" }],
      }],
    });
    const { report } = await gradeScan(root);
    expect(report.rules[0]).toMatchObject({ pages: 2, sharedTarget: { target: "header .menu-btn", pages: 2 } });
    expect(report.rules[0]).not.toHaveProperty("targets");
  });

  it("sums axe incomplete elements into needsReview", async () => {
    mocks.analyze.mockResolvedValue({
      passes: [{ id: "html-has-lang" }],
      violations: [],
      incomplete: [
        { id: "color-contrast", nodes: [{}, {}, {}] },
        { id: "aria-valid-attr-value", nodes: [{}] },
      ],
    });
    const { report } = await gradeScan(mocks.currentUrl);
    expect(report.needsReview).toBe(4);
  });

  it("records zero when axe returned an empty incomplete list", async () => {
    mocks.analyze.mockResolvedValue({ passes: [{ id: "x" }], violations: [], incomplete: [] });
    const { report } = await gradeScan(mocks.currentUrl);
    expect(report.needsReview).toBe(0);
  });
});
