/**
 * Log in to the local Metabase test fixture and save a session.
 *
 * Test-only. `mpersonas auth` is the real path: a human logs in, so we never
 * touch a password. This exists because dogfooding and experiments/ need to
 * reproduce a logged-in run unattended, against a disposable container we own.
 *
 * Credentials are read from .env.local (gitignored, 0600) and passed straight to
 * page.fill(). They are never printed, and never reach the model.
 *
 *   docs/TESTING.md explains how to create the fixture.
 *   Usage: npx tsx scripts/fixture-session.ts [--admin]
 */
import * as fs from "fs";
import { chromium } from "playwright";

const ENV_FILE = ".env.local";
const OUT = ".mpersonas-session.json";

function readEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) {
    throw new Error(`No ${file}. Create the fixture first — see docs/TESTING.md`);
  }
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

async function main() {
  const env = readEnv(ENV_FILE);
  const asAdmin = process.argv.includes("--admin");

  // Personas browse as the non-admin user by default. An agent clicking freely
  // through Metabase's admin section could wreck the fixture it is auditing.
  const email = asAdmin ? env.MP_FIXTURE_ADMIN_EMAIL : env.MP_FIXTURE_USER_EMAIL;
  const password = asAdmin ? env.MP_FIXTURE_ADMIN_PASSWORD : env.MP_FIXTURE_USER_PASSWORD;
  const base = env.MP_FIXTURE_URL;
  if (!email || !password || !base) throw new Error(`${ENV_FILE} is missing fixture keys`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/auth/login`, { waitUntil: "domcontentloaded" });

    await page.fill('input[type="email"], input[name="username"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !/\/auth\/login/.test(u.pathname), { timeout: 30_000 });

    const state = await context.storageState();
    if (state.cookies.length === 0) throw new Error("Login produced no cookies");

    fs.writeFileSync(OUT, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.chmodSync(OUT, 0o600);
    console.log(`Session saved to ${OUT} (${asAdmin ? "admin" : "persona user"}, ${state.cookies.length} cookies)`);
    console.log(`Landed on: ${page.url()}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
