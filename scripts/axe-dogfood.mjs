// Personaudit dogfoods its own promise: scan our public pages with the exact axe
// ruleset the product holds other sites to (see src/agent/axe-scan.ts). An
// accessibility tool that ships accessibility defects is off-brand — this fails CI
// on any violation, in both themes. Reuses the engine's playwright + @axe-core deps
// (no new dependency).
//
// Usage: DOGFOOD_URL=http://localhost:3000 node scripts/axe-dogfood.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE = (process.env.DOGFOOD_URL || "http://localhost:3000").replace(/\/$/, "");

// Public, unauthenticated routes. Gated app surfaces (dashboard, audits, personas)
// need a session and are out of scope for a headless CI scan.
const ROUTES = [
  "/",
  "/for-agencies",
  "/auth/login",
  "/auth/signup",
  "/guides/wcag-checklist",
  "/guides/common-accessibility-issues",
  "/guides/screen-reader-testing",
  "/privacy",
  "/terms",
];

// The site is dark-first, toggled by localStorage 'theme' (see layout.tsx no-FOUC
// script). Light regressions have bitten before (2026-07-30 dogfood), so scan both.
const THEMES = ["dark", "light"];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

async function scan(browser, route, theme) {
  const context = await browser.newContext();
  // Set the theme before any page script runs, so the no-FOUC script picks it up.
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
    } catch {
      /* storage may be unavailable; dark is the default */
    }
  }, theme);
  const page = await context.newPage();
  try {
    // domcontentloaded + a settle rather than networkidle: the hero animation keeps
    // some pages from ever reaching network-idle, which would hang the scan.
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1200);
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    return violations;
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  let totalViolations = 0;
  const report = [];

  try {
    for (const route of ROUTES) {
      for (const theme of THEMES) {
        let violations;
        try {
          violations = await scan(browser, route, theme);
        } catch (e) {
          // A page that fails to load is itself a failure worth surfacing, not a silent pass.
          console.error(`✗ ${route} [${theme}] — scan errored: ${e?.message ?? e}`);
          totalViolations += 1;
          continue;
        }
        if (violations.length === 0) {
          console.log(`✓ ${route} [${theme}] — 0 violations`);
          continue;
        }
        totalViolations += violations.length;
        console.error(`✗ ${route} [${theme}] — ${violations.length} violation(s)`);
        for (const v of violations) {
          const where = v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(" "))
            .join(" | ");
          report.push(`  [${v.impact ?? "n/a"}] ${route} [${theme}] ${v.id}: ${v.help}\n      ${where}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (report.length > 0) {
    console.error("\n─ Violations ─────────────────────────────");
    console.error(report.join("\n"));
  }

  if (totalViolations > 0) {
    console.error(`\nDogfood FAILED: ${totalViolations} accessibility violation(s). We don't ship what we flag.`);
    process.exit(1);
  }
  console.log(`\nDogfood clean: ${ROUTES.length} routes × ${THEMES.length} themes, 0 violations.`);
}

main().catch((e) => {
  console.error("Dogfood runner crashed:", e);
  process.exit(1);
});
