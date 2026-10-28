import { launchAuditBrowser } from "../security/browser.js";
import { runAxeScan, mergeAxeFindings } from "../agent/axe-scan.js";
import type { Finding } from "../agent/engine.js";
import { assertUrlAllowed, isUrlAllowed, assertRequestAllowed } from "../security/url-guard.js";
import { guardedRoute, assertLandedUrlAllowed } from "../security/redirect-guard.js";

/**
 * Authenticated accessibility crawler — the product's spine.
 *
 * Breadth-first over the target's own origin: visit a page, run axe, collect its
 * same-origin links, repeat. With a session it reaches everything behind the
 * login wall; without one it audits whatever is public.
 *
 * Run 4 (2026-07-16) measured this against the LLM persona agent on a real app.
 * The crawler reached 40 states to the personas' 9 and found 264 defects to
 * their 92, for zero model cost. Deterministic, repeatable, cheap — this is the
 * part of the product the evidence actually supports.
 */

export interface CrawlOptions {
  sessionFile?: string;
  maxPages?: number;
  /** CLI-only. The hosted service must never set this. */
  allowPrivate?: boolean;
  onPage?: (url: string, index: number) => void;
}

export interface CrawlResult {
  /** Distinct defects, merged by stable key across every state reached. */
  findings: Finding[];
  pagesVisited: string[];
  /** Discovered but not visited because the page budget ran out. Reported, not hidden. */
  skipped: string[];
  /**
   * Same-origin links that answered with a 4xx. A client error is deterministic (the
   * page is gone or closed to this session), so it is reported as a site problem and
   * the crawl carries on. Transient failures (429, 5xx, timeouts) still abort.
   */
  brokenLinks: BrokenLink[];
}

export interface BrokenLink {
  url: string;
  status: number;
  /** The first scanned page that linked to it. */
  foundOn: string;
}

/** 4xx except 408 and 429, which are about timing rather than the page itself. */
export function isDeterministicClientError(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export async function crawl(entryUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const { sessionFile, maxPages = 40, allowPrivate = false, onPage } = options;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages must be a positive safe integer");
  }

  // Same SSRF chokepoint as an audit: this points a browser at a supplied URL.
  const entry = await assertUrlAllowed(entryUrl, { allowPrivate });
  let origin = entry.origin;

  const browser = await launchAuditBrowser({ headless: true });
  const findings: Finding[] = [];
  const visited: string[] = [];
  const brokenLinks: BrokenLink[] = [];
  const foundOn = new Map<string, string>();
  const seen = new Set<string>([normalise(entry.href)]);
  // An entry on a sub-path (`/demos/bad/`) asks about that section, so its pages fill
  // the budget first and the rest of the origin takes what is left. Same rule as the
  // hosted grader (grader/scan.ts). Two plain queues keep each enqueue O(1).
  let scopePath = scopeOf(entry);
  const inScopeQueue: string[] = [entry.href];
  const outOfScopeQueue: string[] = [];

  try {
    const context = await browser.newContext(sessionFile ? { storageState: sessionFile } : {});

    // SSRF defence on EVERY in-flight request, not just the pre-checked URLs.
    // page.goto follows HTTP redirects and the page loads its own subresources — a
    // public URL that 302s to 169.254.169.254 / an RFC1918 host, or an <img>/fetch
    // to one, would slip past the pre-navigation isUrlAllowed check below. This runs
    // on stranger-supplied URLs, so guard the request layer too (mirrors the audit
    // engine's context.route + grader/scan.ts). Respects allowPrivate for CLI use.
    // context.route sees only the first url of a redirect; guardedRoute vets each hop.
    await context.route(
      "**/*",
      guardedRoute((url, type) => assertRequestAllowed(url, type, { allowPrivate })),
    );

    const page = await context.newPage();

    while (inScopeQueue.length + outOfScopeQueue.length > 0 && visited.length < maxPages) {
      const url = inScopeQueue.length > 0 ? inScopeQueue.shift()! : outOfScopeQueue.shift()!;

      // Re-validate each hop. A same-origin link can still resolve to a private
      // address via a redirect, and this now runs on stranger-supplied URLs.
      if (!(await isUrlAllowed(url, { allowPrivate }))) continue;

      const load = async (): Promise<void> => {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await assertLandedUrlAllowed(page, (u, t) => assertRequestAllowed(u, t, { allowPrivate }));
        if (response && response.status() >= 400) throw new HttpStatusError(response.status());
      };
      try {
        try {
          await load();
        } catch (error) {
          // One retry for a later page: a CI gate should not go red on a single
          // dropped connection. A 4xx will answer the same way, so skip the wait.
          if (visited.length === 0 || (error instanceof HttpStatusError && isDeterministicClientError(error.status))) throw error;
          await page.waitForTimeout(2000);
          await load();
        }
        // SPA routes render after load; scanning too early would undercount.
        await page.waitForTimeout(1500);
      } catch (error) {
        // A dead link elsewhere on the site is a finding about the site, not a gap in
        // the evidence: record it and keep crawling. The entry URL stays fatal.
        if (visited.length > 0 && error instanceof HttpStatusError && isDeterministicClientError(error.status)) {
          brokenLinks.push({ url, status: error.status, foundOn: foundOn.get(normalise(url)) ?? visited[0] ?? entry.href });
          continue;
        }
        // Anything else is missing evidence, not clean evidence. Fail before a caller
        // can pass the CI gate or replace its baseline with an incomplete scan.
        const detail = error instanceof Error ? error.message : String(error);
        const label = visited.length === 0 ? "entry URL" : "URL";
        throw new Error(`Could not load ${label} ${url}: ${detail}`, { cause: error });
      }

      if (visited.length === 0) {
        const settled = new URL(page.url());
        origin = settled.origin;
        scopePath = scopeOf(settled);
      }
      seen.add(normalise(page.url()));
      onPage?.(page.url(), visited.length);
      visited.push(page.url());
      findings.push(...(await runAxeScan(page)));

      const hrefs: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a[href]")).map((a) => (a as HTMLAnchorElement).href),
      );

      for (const href of hrefs) {
        let target: URL;
        try {
          target = new URL(href, url);
        } catch {
          continue;
        }
        if (target.origin !== origin) continue;
        if (!/^#!?\//.test(target.hash)) target.hash = "";
        const key = normalise(target.href);
        if (seen.has(key)) continue;
        seen.add(key);
        foundOn.set(key, page.url());
        (target.pathname.startsWith(scopePath) ? inScopeQueue : outOfScopeQueue).push(target.href);
      }
    }

    // Merge across every state, so one broken component is one defect with the
    // list of states it appeared in — not one per page.
    return {
      findings: mergeAxeFindings(findings),
      pagesVisited: visited,
      skipped: [...inScopeQueue, ...outOfScopeQueue],
      brokenLinks,
    };
  } finally {
    await browser.close();
  }
}

/** The directory an entry URL sits in: `/a/b/page.html` -> `/a/b/`, `/` -> `/`. */
function scopeOf(url: URL): string {
  return url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
}

/** Same crawl target. Keeps query/hash routes, drops ordinary document anchors. */
function normalise(url: string): string {
  try {
    const u = new URL(url);
    if (!/^#!?\//.test(u.hash)) u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}
