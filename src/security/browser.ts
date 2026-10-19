import { chromium, type Browser, type LaunchOptions } from "playwright";

/** Raised when Playwright's Chromium is not installed. The message is the whole fix. */
export class BrowserMissingError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Chromium is not installed. Run: npx playwright install chromium", options);
    this.name = "BrowserMissingError";
  }
}

/** True when a Playwright launch error means the browser binary is absent. */
export function isBrowserMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Executable doesn't exist|browserType\.launch: Executable|Please run the following command to download new browsers/i.test(
    message,
  );
}

/**
 * Names that must never reach the Chromium process. Chromium runs against stranger-supplied
 * pages, so anything credential-shaped in the launching process is withheld from its
 * environment (SEC-001). The hosted worker already hands the scan child an allowlist; this
 * is the second wall for the browser itself, and it also covers CLI/local launches.
 */
const BROWSER_ENV_BLOCKED =
  /^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|STRIPE_|RESEND_|SENTRY_|RAILWAY_|DATABASE_|POSTGRES|CRON_|WORKER_)|SERVICE_ROLE|SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|DSN|WEBHOOK|CREDENTIAL/i;

/** Copy of `source` without credential-shaped variables, for the Chromium process. */
export function browserLaunchEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(source)) {
    if (value !== undefined && !BROWSER_ENV_BLOCKED.test(name)) env[name] = value;
  }
  return env;
}

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

  // Opt-in Chromium sandbox. Playwright launches with --no-sandbox unless chromiumSandbox is
  // true. The sandbox needs user namespaces or a suitable seccomp profile from the host, so
  // it stays off by default and the hosted worker enables it with AUDIT_CHROMIUM_SANDBOX=1
  // once its container allows it. An explicit caller option wins.
  const sandbox = ["1", "true"].includes(process.env.AUDIT_CHROMIUM_SANDBOX ?? "");

  return chromium
    .launch({
      ...(sandbox ? { chromiumSandbox: true } : {}),
      ...options,
      // Scrubbed even when the caller passes its own env: a secret never needs to reach the browser.
      env: browserLaunchEnv(options.env ?? process.env),
      ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
    })
    .catch((error: unknown) => {
      throw isBrowserMissingError(error) ? new BrowserMissingError({ cause: error }) : error;
    });
}
