import { describe, it, expect } from "vitest";
import { isScannablePageUrl } from "./engine.js";

/**
 * axe verdicts must describe the audited site, never a browser error page.
 * A persona following an off-site link can land on chrome-error:// / about:blank;
 * scanning that state reported Chrome's error page as the site's verdict
 * (2026-07-31). Only http(s) states are scannable.
 */
describe("isScannablePageUrl — only real web documents feed the verdict", () => {
  it("accepts http and https states", () => {
    expect(isScannablePageUrl("https://www.example.com/")).toBe(true);
    expect(isScannablePageUrl("http://localhost:3000/dashboard")).toBe(true);
    expect(isScannablePageUrl("HTTPS://EXAMPLE.COM")).toBe(true);
  });

  it("rejects the chrome-error page reached after an off-site link", () => {
    expect(isScannablePageUrl("chrome-error://chromewebdata/")).toBe(false);
  });

  it("rejects non-document states", () => {
    for (const url of [
      "about:blank",
      "data:text/html,<h1>hi</h1>",
      "blob:https://example.com/abc",
      "chrome://settings",
      "file:///etc/hosts",
      "",
    ]) {
      expect(isScannablePageUrl(url)).toBe(false);
    }
  });
});
