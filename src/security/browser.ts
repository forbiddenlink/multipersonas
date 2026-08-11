import { chromium, type Browser, type LaunchOptions } from "playwright";

/**
 * Launch Chromium for an audit.
 *
 * `url-guard.ts` validates the RESOLVED address of every navigation and subresource, but
 * it resolves DNS and then Chromium resolves again on connect — a DNS-rebinding attacker
 * controlling the target's DNS can answer public first (passing the guard) and private on
 * Chromium's second lookup. Closing that TOCTOU needs the browser host to be unable to
 * REACH private addresses at the network layer.
 *
 * When `AUDIT_BROWSER_PROXY` is set (the hosted worker points it at a smokescreen egress
 * proxy — see docs/ssrf-egress-hardening.md), every browser connection is forced through
 * that proxy, which re-validates the destination against a private/reserved-range denylist
 * at connect time. If the proxy is unreachable the browser cannot connect, so audits fail
 * closed rather than bypassing the guard. Unset (CLI / local), this is a plain launch, so
 * behaviour off the worker is unchanged.
 */
export function launchAuditBrowser(options: LaunchOptions = {}): Promise<Browser> {
  const proxyServer = process.env.AUDIT_BROWSER_PROXY?.trim();

  // Fail-closed enforcement for the hosted worker. The DNS-rebinding TOCTOU (above)
  // is only truly closed when the browser host cannot reach private IPs at the network
  // layer — i.e. AUDIT_BROWSER_PROXY points at a smokescreen egress proxy. Setting
  // AUDIT_REQUIRE_EGRESS_PROXY=1 makes a missing/blank proxy a hard error instead of a
  // silent direct launch, so the worker refuses to run stranger-supplied URLs with the
  // rebinding hole open rather than bypassing it. Default off, so CLI/local launches and
  // any environment that has not yet wired the sidecar are unchanged.
  if (
    process.env.AUDIT_REQUIRE_EGRESS_PROXY === "1" &&
    !proxyServer
  ) {
    throw new Error(
      "AUDIT_REQUIRE_EGRESS_PROXY=1 but AUDIT_BROWSER_PROXY is not set: refusing to launch " +
        "the audit browser without an egress proxy (DNS-rebinding SSRF would be unmitigated).",
    );
  }

  return chromium.launch({
    ...options,
    ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
  });
}
