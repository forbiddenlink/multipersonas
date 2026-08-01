// Dev-only: capture full-page screenshots of local routes in dark + light for a
// design review. Not shipped, not linted into CI. Usage:
//   SHOT_URL=http://localhost:3111 node scripts/shot.mjs /  /for-agencies
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = (process.env.SHOT_URL || "http://localhost:3111").replace(/\/$/, "");
const OUT = process.env.SHOT_OUT || "/tmp/shots";
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const route of routes) {
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({
      viewport: {
        width: Number(process.env.SHOT_W) || 1440,
        height: Number(process.env.SHOT_H) || 900,
      },
    });
    await ctx.addInitScript((t) => {
      try {
        window.localStorage.setItem("theme", t);
      } catch {
        /* storage unavailable; dark is the default */
      }
    }, theme);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(800);
    // Scroll through so IntersectionObserver-gated reveal sections fire, then return to top.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    const name = (route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "")) + `-${theme}.png`;
    await page.screenshot({ path: `${OUT}/${name}`, fullPage: true });
    console.log(`${OUT}/${name}`);
    await ctx.close();
  }
}
await browser.close();
