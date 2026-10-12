import { describe, it, expect, afterEach, vi } from "vitest";
import { chromium, type Browser } from "playwright";
import { launchAuditBrowser, isBrowserMissingError, BrowserMissingError } from "./browser.js";

/**
 * The fail-closed egress gate must refuse to launch when the hosted worker demands an
 * egress proxy (AUDIT_REQUIRE_EGRESS_PROXY=1) but none is configured — otherwise the
 * DNS-rebinding TOCTOU is silently left open. We assert the refusal happens BEFORE any
 * real Chromium launch (the throw is synchronous), so the test needs no browser binary.
 */
describe("launchAuditBrowser egress-proxy enforcement", () => {
  const saved = {
    require: process.env.AUDIT_REQUIRE_EGRESS_PROXY,
    proxy: process.env.AUDIT_BROWSER_PROXY,
  };

  afterEach(() => {
    process.env.AUDIT_REQUIRE_EGRESS_PROXY = saved.require;
    process.env.AUDIT_BROWSER_PROXY = saved.proxy;
    if (saved.require === undefined) delete process.env.AUDIT_REQUIRE_EGRESS_PROXY;
    if (saved.proxy === undefined) delete process.env.AUDIT_BROWSER_PROXY;
  });

  it("throws synchronously when a proxy is required but not set", () => {
    process.env.AUDIT_REQUIRE_EGRESS_PROXY = "1";
    delete process.env.AUDIT_BROWSER_PROXY;
    expect(() => launchAuditBrowser()).toThrow(/egress proxy/i);
  });

  it("throws when the required proxy is only whitespace", () => {
    process.env.AUDIT_REQUIRE_EGRESS_PROXY = "1";
    process.env.AUDIT_BROWSER_PROXY = "   ";
    expect(() => launchAuditBrowser()).toThrow(/egress proxy/i);
  });
});

describe("browser-missing error mapping", () => {
  it("recognises Playwright's missing-executable launch error", () => {
    const raw = new Error(
      "browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1234/chrome\n" +
        "Looks like Playwright was just installed or updated. Please run the following command to download new browsers:",
    );
    expect(isBrowserMissingError(raw)).toBe(true);
  });

  it("does not claim unrelated launch failures are a missing browser", () => {
    expect(isBrowserMissingError(new Error("Target page, context or browser has been closed"))).toBe(false);
    expect(isBrowserMissingError("boom")).toBe(false);
  });

  it("gives one friendly line with the fix and keeps the original cause", () => {
    const cause = new Error("Executable doesn't exist at /x");
    const err = new BrowserMissingError({ cause });
    expect(err.message).toBe("Chromium is not installed. Run: npx playwright install chromium");
    expect(err.cause).toBe(cause);
  });
});

describe("launchAuditBrowser Chromium sandbox opt-in", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AUDIT_CHROMIUM_SANDBOX;
    delete process.env.AUDIT_REQUIRE_EGRESS_PROXY;
    delete process.env.AUDIT_BROWSER_PROXY;
  });

  async function launchedOptions(): Promise<Record<string, unknown>> {
    const launch = vi.spyOn(chromium, "launch").mockResolvedValue({} as Browser);
    await launchAuditBrowser({ headless: true });
    return launch.mock.calls[0]![0] as Record<string, unknown>;
  }

  it("keeps Playwright's default (sandbox off) unless opted in", async () => {
    expect((await launchedOptions()).chromiumSandbox).toBeUndefined();
  });

  it.each(["1", "true"])("enables the Chromium sandbox when AUDIT_CHROMIUM_SANDBOX=%s", async (value) => {
    process.env.AUDIT_CHROMIUM_SANDBOX = value;
    const options = await launchedOptions();
    expect(options.chromiumSandbox).toBe(true);
    expect(options.headless).toBe(true);
  });

  it.each(["0", "false", "", "yes"])("ignores AUDIT_CHROMIUM_SANDBOX=%j", async (value) => {
    process.env.AUDIT_CHROMIUM_SANDBOX = value;
    expect((await launchedOptions()).chromiumSandbox).toBeUndefined();
  });

  it("does not override an explicit caller choice", async () => {
    process.env.AUDIT_CHROMIUM_SANDBOX = "1";
    const launch = vi.spyOn(chromium, "launch").mockResolvedValue({} as Browser);
    await launchAuditBrowser({ chromiumSandbox: false });
    expect((launch.mock.calls[0]![0] as Record<string, unknown>).chromiumSandbox).toBe(false);
  });
});
