import { describe, it, expect } from "vitest";
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
