import { launchAuditBrowser } from "../security/browser.js";
import { AxeBuilder } from "@axe-core/playwright";
import { assertUrlAllowed, isUrlAllowed, assertRequestAllowed } from "../security/url-guard.js";
import { computeGrade, type PageAxe, type Impact, type GradeReport, type GradeRuleHit } from "./score.js";

// Public-only accessibility grader scan — the free teaser wedge.
//
// A deliberately SMALL breadth-first crawl over the target's own origin, axe at
// every page, no login, no model. Kept separate from src/crawler/crawl.ts (the
// full product spine) because the grader has different needs: a hard page cap, a
// public-only posture, and it must capture axe PASSES (not just violations) so
// score.ts can compute an honest ratio. It never accepts a session or
// allowPrivate — this runs on stranger-supplied URLs.

export interface GradeScanOptions {
  maxPages?: number;
  onPage?: (url: string, index: number) => void;
}

export interface GradeScanResult {
  entryUrl: string;
  report: GradeReport;
  pagesVisited: string[];
  skipped: string[];
}

// axe tags WCAG 2.0 / 2.1 / 2.2 level A+AA separately. Counting only wcag2a/aa
// under-reports modern criteria (e.g. a rule tagged wcag21aa but not wcag2aa).
// Keep best-practice out — those are not WCAG success criteria.
const AA_TAGS = new Set([
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
]);
const IMPACTS: Impact[] = ["critical", "serious", "moderate", "minor"];

function emptyImpacts(): Record<Impact, number> {
  return { critical: 0, serious: 0, moderate: 0, minor: 0 };
}

export async function gradeScan(
  entryUrl: string,
  opts: GradeScanOptions = {},
): Promise<GradeScanResult> {
  const { maxPages = 10, onPage } = opts;

  // Same SSRF chokepoint as an audit. No allowPrivate — public targets only.
  const entry = await assertUrlAllowed(entryUrl);
  const origin = entry.origin;

  const browser = await launchAuditBrowser({ headless: true });
  const pages: PageAxe[] = [];
  const visited: string[] = [];
  const seen = new Set<string>([entry.href]);
  const queue: string[] = [entry.href];

  try {
    const context = await browser.newContext();

    // SSRF defence on EVERY in-flight request, not just the URLs we pre-check.
    // page.goto follows HTTP redirects and the page loads its own subresources —
    // a public URL that 302s to 169.254.169.254 / an RFC1918 host, or an <img>/
    // fetch to one, would bypass the pre-navigation isUrlAllowed check. This runs
    // on stranger-supplied URLs, so guard the request layer (mirrors the audit
    // engine's context.route guard). No scope origin: block private/reserved
    // always, but allow legit cross-origin public redirects (apex <-> www, CDNs).
    await context.route("**/*", async (route, request) => {
      const allowed = await assertRequestAllowed(request.url(), request.resourceType());
      return allowed ? route.continue() : route.abort("blockedbyclient");
    });

    const page = await context.newPage();

    while (queue.length > 0 && visited.length < maxPages) {
      const url = queue.shift()!;

      // Re-validate every hop: a same-origin link can redirect to a private
      // address, and this runs on stranger-supplied URLs.
      if (!(await isUrlAllowed(url))) continue;

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        // SPA routes render after load; scanning too early undercounts.
        await page.waitForTimeout(1500);
      } catch {
        continue;
      }

      const results = await new AxeBuilder({ page }).analyze();
      const byImpact = emptyImpacts();
      let aa = 0;
      const rules: GradeRuleHit[] = [];
      for (const v of results.violations) {
        const raw = (v.impact ?? "minor") as Impact;
        const impact: Impact = IMPACTS.includes(raw) ? raw : "minor";
        byImpact[impact] += v.nodes.length;
        const wcagAA = Boolean(v.tags?.some((t) => AA_TAGS.has(t)));
        if (wcagAA) aa += v.nodes.length;
        rules.push({
          id: v.id,
          impact,
          nodes: v.nodes.length,
          help: v.help,
          wcagAA,
        });
      }

      pages.push({
        url: page.url(),
        violationsByImpact: byImpact,
        passCount: results.passes.length,
        wcagAAViolations: aa,
        rules,
      });
      onPage?.(page.url(), visited.length);
      visited.push(page.url());

      // Enqueue same-origin links for the public crawl.
      const hrefs = await page.$$eval("a[href]", (as) =>
        as.map((a) => (a as HTMLAnchorElement).href),
      );
      for (const href of hrefs) {
        try {
          const u = new URL(href);
          if (u.origin === origin && !seen.has(u.href)) {
            seen.add(u.href);
            queue.push(u.href);
          }
        } catch {
          /* ignore unparseable hrefs */
        }
      }
    }
  } finally {
    await browser.close();
  }

  return {
    entryUrl: entry.href,
    report: computeGrade(pages),
    pagesVisited: visited,
    skipped: queue,
  };
}
