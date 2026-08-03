import { launchAuditBrowser } from "../security/browser.js";
import { runAxeScan, mergeAxeFindings } from "../agent/axe-scan.js";
import type { Finding } from "../agent/engine.js";
import { assertUrlAllowed, isUrlAllowed, assertRequestAllowed } from "../security/url-guard.js";

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
}

export async function crawl(entryUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const { sessionFile, maxPages = 40, allowPrivate = false, onPage } = options;

  // Same SSRF chokepoint as an audit: this points a browser at a supplied URL.
  const entry = await assertUrlAllowed(entryUrl, { allowPrivate });
  const origin = entry.origin;

  const browser = await launchAuditBrowser({ headless: true });
  const findings: Finding[] = [];
  const visited: string[] = [];
  const seen = new Set<string>([normalise(entry.href)]);
  const queue: string[] = [entry.href];

  try {
    const context = await browser.newContext(sessionFile ? { storageState: sessionFile } : {});

    // SSRF defence on EVERY in-flight request, not just the pre-checked URLs.
    // page.goto follows HTTP redirects and the page loads its own subresources — a
    // public URL that 302s to 169.254.169.254 / an RFC1918 host, or an <img>/fetch
    // to one, would slip past the pre-navigation isUrlAllowed check below. This runs
    // on stranger-supplied URLs, so guard the request layer too (mirrors the audit
    // engine's context.route + grader/scan.ts). Respects allowPrivate for CLI use.
    await context.route("**/*", async (route, request) => {
      const allowed = await assertRequestAllowed(request.url(), request.resourceType(), {
        allowPrivate,
      });
      return allowed ? route.continue() : route.abort("blockedbyclient");
    });

    const page = await context.newPage();

    while (queue.length > 0 && visited.length < maxPages) {
      const url = queue.shift()!;

      // Re-validate each hop. A same-origin link can still resolve to a private
      // address via a redirect, and this now runs on stranger-supplied URLs.
      if (!(await isUrlAllowed(url, { allowPrivate }))) continue;

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        // SPA routes render after load; scanning too early would undercount.
        await page.waitForTimeout(1500);
      } catch {
        continue;
      }

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
        target.hash = "";
        const key = normalise(target.href);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(target.href);
      }
    }

    // Merge across every state, so one broken component is one defect with the
    // list of states it appeared in — not one per page.
    return { findings: mergeAxeFindings(findings), pagesVisited: visited, skipped: queue };
  } finally {
    await browser.close();
  }
}

/** Same crawl target. Drops the fragment; keeps the query, which routes SPAs. */
function normalise(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}
