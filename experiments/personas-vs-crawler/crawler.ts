import { chromium } from "playwright";
import { runAxeScan } from "../../src/agent/axe-scan.js";
import type { Finding } from "../../src/agent/engine.js";

/**
 * Arm C: the honest baseline.
 *
 * A breadth-first, same-origin link crawler with the same session and the same
 * axe configuration as the product. This is what a competent engineer builds in
 * an afternoon, and if it finds everything the personas find then the personas
 * are not worth their model calls.
 *
 * Steel-manned on purpose (see the pre-registration): it gets a larger page
 * budget than the personas get steps, because it costs nothing to run and in
 * real life you would let it go. Nothing here is tuned to make it lose.
 */

export interface CrawlResult {
  findings: Finding[];
  pagesVisited: string[];
  /** Discovered but not visited because the budget ran out. Reported for honesty. */
  skipped: string[];
}

export async function crawl(
  entryUrl: string,
  sessionFile: string,
  maxPages = 40,
): Promise<CrawlResult> {
  const origin = new URL(entryUrl).origin;
  const browser = await chromium.launch({ headless: true });
  const findings: Finding[] = [];
  const visited: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [entryUrl];
  seen.add(normalise(entryUrl));

  try {
    const context = await browser.newContext({ storageState: sessionFile });
    const page = await context.newPage();

    while (queue.length > 0 && visited.length < maxPages) {
      const url = queue.shift()!;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        // SPA routes render after load; a crawler that scans too early would be
        // unfairly weakened, and this baseline must not be sandbagged.
        await page.waitForTimeout(1500);
      } catch {
        continue;
      }

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

    return { findings, pagesVisited: visited, skipped: queue };
  } finally {
    await browser.close();
  }
}

/** Same page, same crawl target. Ignores the fragment; keeps the query, which routes SPAs. */
function normalise(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}
