// Dev-only product walkthrough: visits every route, checks every link and in-page
// anchor, opens every <details>, clicks every non-submit, non-navigating button, and
// records console errors, failed requests, horizontal overflow, missing <h1>, and
// images without alt. Not shipped, not in CI.
//
// Usage:
//   SHOT_URL=http://localhost:3000 node scripts/walkthrough.mjs            # public routes
//   SHOT_URL=... WALK_STATE=./state.json node scripts/walkthrough.mjs /dashboard /projects
// Env: WALK_OUT (report dir), WALK_W (viewport width, default 1440).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = (process.env.SHOT_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.WALK_OUT || "/tmp/walk";
const W = Number(process.env.WALK_W) || 1440;
const PUBLIC = [
  "/", "/grade", "/sample-report", "/pricing", "/for-agencies", "/docs",
  "/guides/wcag-checklist", "/guides/common-accessibility-issues",
  "/guides/screen-reader-testing", "/guides/ci-accessibility-gate",
  "/guides/accessibility-deadlines", "/accessibility", "/privacy", "/terms",
  "/auth/login", "/auth/signup", "/auth/forgot-password", "/this-page-does-not-exist",
];
const routes = process.argv.slice(2).length ? process.argv.slice(2) : PUBLIC;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: 900 },
  ...(process.env.WALK_STATE ? { storageState: process.env.WALK_STATE } : {}),
});
const linkStatus = new Map();
const report = [];

async function checkLink(href) {
  if (linkStatus.has(href)) return linkStatus.get(href);
  let status;
  try {
    const res = await ctx.request.get(href, { maxRedirects: 5, timeout: 45000 });
    status = res.status();
  } catch (e) {
    status = `ERR ${String(e).slice(0, 60)}`;
  }
  linkStatus.set(href, status);
  return status;
}

for (const route of routes) {
  const page = await ctx.newPage();
  const issues = [];
  page.on("console", (m) => {
    if (m.type() === "error") issues.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => issues.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (!u.includes("posthog") && !u.includes("/ingest") && !u.includes("_next/webpack-hmr"))
      issues.push(`requestfailed: ${u.slice(0, 120)} ${r.failure()?.errorText ?? ""}`);
  });

  let status;
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    status = res?.status();
  } catch (e) {
    issues.push(`goto: ${String(e).slice(0, 120)}`);
  }

  const facts = await page.evaluate(() => {
    const doc = document.documentElement;
    const links = [...document.querySelectorAll("a[href]")].map((a) => ({
      href: a.getAttribute("href"),
      text: (a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 50),
    }));
    const missingAnchors = links
      .filter((l) => l.href && l.href.startsWith("#") && l.href.length > 1)
      .filter((l) => !document.getElementById(decodeURIComponent(l.href.slice(1))))
      .map((l) => l.href);
    const overflow = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > doc.clientWidth + 1 && window.getComputedStyle(el).position !== "fixed";
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return {
      title: document.title,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent?.trim().slice(0, 80)),
      links,
      missingAnchors,
      imgNoAlt: [...document.querySelectorAll("img:not([alt])")].length,
      pageOverflowX: doc.scrollWidth > doc.clientWidth,
      overflow,
      emDashes: (document.body.innerText.match(/—/g) || []).length,
      buttons: [...document.querySelectorAll("button:not([type=submit]):not([disabled])")].length,
      details: document.querySelectorAll("details").length,
    };
  });

  if (facts.h1.length !== 1) issues.push(`h1 count ${facts.h1.length}`);
  if (facts.missingAnchors.length) issues.push(`missing anchors: ${facts.missingAnchors.join(", ")}`);
  if (facts.imgNoAlt) issues.push(`img without alt: ${facts.imgNoAlt}`);
  if (facts.pageOverflowX) issues.push(`horizontal overflow: ${facts.overflow.join(" | ")}`);
  if (facts.emDashes) issues.push(`em dashes in visible text: ${facts.emDashes}`);

  // Every internal link must resolve.
  for (const l of facts.links) {
    if (!l.href || l.href.startsWith("#") || l.href.startsWith("mailto:") || l.href.startsWith("tel:")) continue;
    const abs = new URL(l.href, `${BASE}${route}`).toString();
    if (!abs.startsWith(BASE)) continue;
    const s = await checkLink(abs.split("#")[0]);
    if (typeof s !== "number" || s >= 400) issues.push(`broken link "${l.text}" -> ${l.href} (${s})`);
  }

  // Open every disclosure, click every plain button; note anything that throws.
  const summaries = await page.locator("details > summary").all();
  for (const s of summaries) {
    try {
      if (await s.isVisible()) await s.click({ timeout: 2000 });
    } catch (e) {
      issues.push(`summary click: ${String(e).slice(0, 80)}`);
    }
  }
  const buttons = await page.locator("button:not([type=submit]):not([disabled])").all();
  for (const b of buttons.slice(0, 25)) {
    try {
      if (!(await b.isVisible())) continue;
      const label = ((await b.getAttribute("aria-label")) || (await b.textContent()) || "").trim();
      if (/sign out|delete|remove|log out/i.test(label)) continue; // never destructive
      await b.click({ timeout: 2000 });
      await page.keyboard.press("Escape").catch(() => {});
    } catch (e) {
      issues.push(`button click: ${String(e).slice(0, 80)}`);
    }
  }
  if (page.url() !== `${BASE}${route}` && !route.includes("does-not-exist")) {
    // a button navigated; fine, but note it
  }

  const name = (route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "")) || "root";
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.screenshot({ path: `${OUT}/${name}-${W}.png`, fullPage: true }).catch(() => {});

  report.push({ route, status, title: facts.title, h1: facts.h1, links: facts.links.length, buttons: facts.buttons, details: facts.details, issues });
  await page.close();
}
await browser.close();

writeFileSync(`${OUT}/walkthrough.json`, JSON.stringify(report, null, 2));
for (const r of report) {
  console.log(`\n${r.status ?? "?"} ${r.route}  "${r.title}"  links=${r.links} buttons=${r.buttons}`);
  for (const i of r.issues) console.log(`   - ${i}`);
}
