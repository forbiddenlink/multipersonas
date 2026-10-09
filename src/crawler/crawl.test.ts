import { describe, it, expect, vi } from "vitest";

const { launchAuditBrowser, runAxeScan } = vi.hoisted(() => ({
  launchAuditBrowser: vi.fn(),
  runAxeScan: vi.fn().mockResolvedValue([]),
}));

vi.mock("../security/browser.js", () => ({ launchAuditBrowser }));
vi.mock("../agent/axe-scan.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../agent/axe-scan.js")>(),
  runAxeScan,
}));

import { crawl } from "./crawl.js";
import { BlockedUrlError } from "../security/url-guard.js";

/**
 * The crawler is now product code and takes a stranger-supplied URL, so it must
 * clear the same SSRF bar as an audit. These pin the guard without needing a
 * live site — a blocked URL must never quietly return an empty scan.
 */
describe("crawl — SSRF guard", () => {
  it("refuses cloud metadata", async () => {
    await expect(crawl("http://169.254.169.254/")).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it("refuses localhost without allowPrivate", async () => {
    await expect(crawl("http://localhost:3010/")).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it("refuses file: and other schemes", async () => {
    await expect(crawl("file:///etc/passwd")).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it("refuses a non-URL", async () => {
    await expect(crawl("not a url")).rejects.toBeInstanceOf(BlockedUrlError);
  });
});

describe("crawl — evidence honesty", () => {
  it.each([
    {
      entry: "http://localhost:3010/", settled: "http://localhost:3010/",
      links: ["http://localhost:3010/#main", "http://localhost:3010/#/checkout", "http://localhost:3010/#!/account"],
      visited: ["http://localhost:3010/", "http://localhost:3010/#/checkout", "http://localhost:3010/#!/account"],
    },
    {
      entry: "http://localhost:3010/", settled: "http://localhost:3011/",
      links: ["http://localhost:3011/checkout", "http://localhost:3012/outside"],
      visited: ["http://localhost:3011/", "http://localhost:3011/checkout"],
    },
  ])("covers reachable routes after settling $entry to $settled", async ({ entry, settled, links, visited }) => {
    let currentUrl = entry;
    launchAuditBrowser.mockResolvedValueOnce({
      close: vi.fn(),
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(async (url: string) => {
            currentUrl = url === entry ? settled : url;
            return { status: () => 200 };
          }),
          waitForTimeout: vi.fn(),
          url: () => currentUrl,
          evaluate: vi.fn().mockResolvedValueOnce(links).mockResolvedValue([]),
        }),
      }),
    });

    expect((await crawl(entry, { allowPrivate: true })).pagesVisited).toEqual(visited);
  });

  it("returns scanned states and discloses links left by a valid page budget", async () => {
    launchAuditBrowser.mockResolvedValueOnce({
      close: vi.fn(),
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({ status: () => 200 }),
          waitForTimeout: vi.fn(),
          url: () => "http://localhost:3010/",
          evaluate: vi.fn().mockResolvedValue(["http://localhost:3010/next"]),
        }),
      }),
    });

    await expect(crawl("http://localhost:3010", { allowPrivate: true, maxPages: 1 }))
      .resolves.toEqual({
        findings: [],
        pagesVisited: ["http://localhost:3010/"],
        skipped: ["http://localhost:3010/next"],
      });
  });

  it.each([0, -1, NaN, Infinity, 1.5])("rejects invalid page budget %s", async (maxPages) => {
    launchAuditBrowser.mockResolvedValue({
      close: vi.fn(),
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({ status: () => 200 }),
          waitForTimeout: vi.fn(),
          url: () => "http://localhost:3010/",
          evaluate: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(crawl("http://localhost:3010", { allowPrivate: true, maxPages }))
      .rejects.toThrow("maxPages must be a positive safe integer");
  });

  it("rejects a later navigation failure rather than returning incomplete clean evidence", async () => {
    const close = vi.fn();
    launchAuditBrowser.mockResolvedValueOnce({
      close,
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValueOnce({ status: () => 200 })
            .mockRejectedValueOnce(new Error("connection refused")),
          waitForTimeout: vi.fn(),
          url: () => "http://localhost:3010/",
          evaluate: vi.fn().mockResolvedValue(["http://localhost:3010/broken"]),
        }),
      }),
    });

    await expect(crawl("http://localhost:3010", { allowPrivate: true }))
      .rejects.toThrow("Could not load URL http://localhost:3010/broken: connection refused");
    expect(close).toHaveBeenCalledOnce();
  });

  it.each([404, 500])("rejects HTTP %s rather than scanning the error page as the target", async (status) => {
    const close = vi.fn();
    launchAuditBrowser.mockResolvedValueOnce({
      close,
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({ status: () => status }),
          waitForTimeout: vi.fn(),
          url: () => "http://localhost:3010/",
          evaluate: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(crawl("http://localhost:3010", { allowPrivate: true }))
      .rejects.toThrow(`HTTP ${status}`);
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects an unreachable entry URL rather than returning a clean scan", async () => {
    const close = vi.fn();
    launchAuditBrowser.mockResolvedValueOnce({
      close,
      newContext: vi.fn().mockResolvedValue({
        route: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockRejectedValue(new Error("connection refused")),
        }),
      }),
    });

    await expect(crawl("http://localhost:3010", { allowPrivate: true }))
      .rejects.toThrow("Could not load entry URL http://localhost:3010/: connection refused");
    expect(close).toHaveBeenCalledOnce();
  });
});
