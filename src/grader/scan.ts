import { launchAuditBrowser } from "../security/browser.js";
import { AxeBuilder } from "@axe-core/playwright";
import { assertUrlAllowed, isUrlAllowed, assertRequestAllowed } from "../security/url-guard.js";
import { computeGrade, MAX_RULE_EXAMPLES, type PageAxe, type Impact, type GradeReport, type GradeRuleHit } from "./score.js";
import { SEVERITIES } from "../domain/vocab.js";

/** Selectors kept per rule per page, only to spot a selector repeating across pages. */
const TARGETS_PER_RULE_MAX = 50;

/** Same cap the CLI scan uses for node HTML (src/agent/axe-scan.ts). */
const EXAMPLE_HTML_MAX = 200;

/**
 * axe targets are a list of selectors, one per frame/shadow-root hop, where a hop can
 * itself be a list. Render the whole path readably. Deliberately not shared with the CLI's
 * `target.join(" > ")`: that string feeds stable defect keys, so changing it would rotate
 * every CI baseline.
 */
function selectorPath(target: readonly (string | readonly string[])[]): string {
  return target.map((hop) => (Array.isArray(hop) ? hop.join(" >>> ") : String(hop))).join(" >>> ");
}

function capHtml(html: string): string {
  return html.length > EXAMPLE_HTML_MAX ? `${html.slice(0, EXAMPLE_HTML_MAX)}\u2026` : html;
}

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
  /** Discovered URLs not evaluated, including failed/blocked loads and the page cap. */
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
const IMPACTS: Impact[] = [...SEVERITIES];

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
  const skipped: string[] = [];
  const seen = new Set<string>([entry.href]);
  // A visitor who enters a sub-path (`/demos/bad/`) is asking about that section,
  // so its pages fill the page limit first; the rest of the site only takes the
  // slots left over. An entry at the site root keeps plain link order. Two plain
  // queues keep each enqueue O(1): a hostile page can carry thousands of links.
  const scopePath = entry.pathname.slice(0, entry.pathname.lastIndexOf("/") + 1);
  const inScopeQueue: string[] = [entry.href];
  const outOfScopeQueue: string[] = [];
  const enqueue = (u: URL) => {
    (u.pathname.startsWith(scopePath) ? inScopeQueue : outOfScopeQueue).push(u.href);
  };
  const remaining = () => [...inScopeQueue, ...outOfScopeQueue];

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
    let loadedDocument: string | null = null;

    while (inScopeQueue.length + outOfScopeQueue.length > 0 && visited.length < maxPages) {
      const url = (inScopeQueue.length > 0 ? inScopeQueue : outOfScopeQueue).shift()!;

      // Re-validate every hop: a same-origin link can redirect to a private
      // address, and this runs on stranger-supplied URLs.
      if (!(await isUrlAllowed(url))) {
        skipped.push(url);
        continue;
      }

      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const documentUrl = new URL(page.url());
        documentUrl.hash = "";
        // Playwright resolves goto for HTTP errors. An error document is not
        // evidence about the page the visitor asked us to evaluate.
        // Hash-route navigation can return null while retaining a known-good
        // document; preserve those SPA states without trusting an initial null.
        if (response ? !response.ok() : loadedDocument !== documentUrl.href) {
          loadedDocument = null;
          skipped.push(url);
          continue;
        }
        loadedDocument = documentUrl.href;
        // SPA routes render after load; scanning too early undercounts.
        await page.waitForTimeout(1500);
      } catch {
        loadedDocument = null;
        skipped.push(url);
        continue;
      }

      const results = await new AxeBuilder({ page }).analyze();
      if (results.passes.length === 0 && results.violations.length === 0) {
        skipped.push(url);
        continue;
      }
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
          targets: v.nodes.slice(0, TARGETS_PER_RULE_MAX).map((n) => selectorPath(n.target)),
          examples: v.nodes.slice(0, MAX_RULE_EXAMPLES).map((n) => ({
            url: page.url(),
            target: selectorPath(n.target),
            html: capHtml(n.html),
          })),
        });
      }

      pages.push({
        url: page.url(),
        violationsByImpact: byImpact,
        passCount: results.passes.length,
        wcagAAViolations: aa,
        rules,
        // Present only when axe returned the list, so "not recorded" stays distinct from zero.
        ...(Array.isArray(results.incomplete)
          ? { incompleteNodes: results.incomplete.reduce((n, i) => n + (i.nodes?.length ?? 0), 0) }
          : {}),
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
          // `#main` on the same document is a skip link, not a new state: scanning
          // it re-counts the page. Hash routes (`#/contact`, `#!/x`) stay, for SPAs.
          if (u.hash && !/^#!?\//.test(u.hash)) u.hash = "";
          if (u.origin === origin && !seen.has(u.href)) {
            seen.add(u.href);
            enqueue(u);
          }
        } catch {
          /* ignore unparseable hrefs */
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (pages.length === 0) {
    throw new Error("No public pages could be evaluated. Please try again.");
  }

  return {
    entryUrl: entry.href,
    report: { ...computeGrade(pages), coverage: { pageLimit: maxPages, skippedPages: skipped.length + remaining().length } },
    pagesVisited: visited,
    skipped: [...skipped, ...remaining()],
  };
}
