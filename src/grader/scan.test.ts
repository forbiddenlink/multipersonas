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
