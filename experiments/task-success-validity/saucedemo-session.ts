/**
 * Capture a SauceDemo session for the run-2 task-success validation.
 *
 * SauceDemo (https://www.saucedemo.com) is a public test sandbox built for
 * automation. Its credentials are printed on its own login page, so these are
 * not secrets — but the agent still never sees them: we log in here and save
 * only the resulting storageState, the same discipline as `mpersonas auth`.
 *
 *   npx tsx experiments/task-success-validity/saucedemo-session.ts
 */
import * as fs from "fs";
import { chromium } from "playwright";

const BASE = "https://www.saucedemo.com";
const OUT = ".saucedemo-session.json";
// Published on the SauceDemo login page. Public demo credentials, not a secret.
const USER = "standard_user";
const PASS = "secret_sauce";

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.fill("#user-name", USER);
    await page.fill("#password", PASS);
    await page.click("#login-button");
    await page.waitForURL(/inventory\.html/, { timeout: 20_000 });

    const state = await context.storageState();
    fs.writeFileSync(OUT, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.chmodSync(OUT, 0o600);
    console.log(`Session saved to ${OUT} (${state.cookies.length} cookies)`);
    console.log(`Landed on: ${page.url()}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
