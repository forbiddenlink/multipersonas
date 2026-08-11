import { describe, it, expect, afterEach } from "vitest";
import { launchAuditBrowser } from "./browser.js";

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
