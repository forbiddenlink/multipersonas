import * as fs from "fs";
import * as readline from "node:readline/promises";
import { chromium } from "playwright";
import { assertUrlAllowed } from "../security/url-guard.js";

/**
 * Authenticated sessions.
 *
 * Personas that cannot log in can only ever audit a public marketing page —
 * which is exactly where axe-core and a crawler already work for free. Every
 * flow worth testing (onboarding, checkout, settings) is behind a login wall.
 * Dogfooding on 2026-07-15 ended after six steps of bouncing off /auth/login.
 *
 * The design constraint that shapes everything here: THE AGENT NEVER SEES
 * CREDENTIALS. Handing a password to the model would copy it into the model
 * provider's context, the step log, and any finding the model chose to quote it
 * in. So a human logs in themselves, in a real browser, and we persist only the
 * resulting session. That also means SSO, 2FA, magic links and CAPTCHAs all
 * work for free — we never reimplement a login form.
 *
 * The saved file contains live session cookies. It is credential-equivalent:
 * mode 0600, gitignored, never logged, never sent to the model.
 */

/** Bearer-equivalent. Anything that can read this file can be the user. */
const SESSION_FILE_MODE = 0o600;

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

/**
 * Open a real browser, let a human log in, and save the resulting session.
 *
 * Headed and interactive by design: the point is that a person authenticates,
 * not that we automate a password.
 */
export async function captureSession(
  url: string,
  outFile: string,
  options: { allowPrivate?: boolean; waitForEnter?: () => Promise<void> } = {},
): Promise<void> {
  // Same bar as an audit target — this still points a browser at a supplied URL.
  const safeUrl = await assertUrlAllowed(url, { allowPrivate: options.allowPrivate });

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(safeUrl.href, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // No scope restriction and no request interception here: a human is driving,
    // and real logins bounce through identity providers on other origins.
    const wait = options.waitForEnter ?? defaultWaitForEnter;
    await wait();

    const state = await context.storageState();
    if (state.cookies.length === 0 && state.origins.length === 0) {
      throw new SessionError(
        "No session data was found — it looks like you did not finish logging in. Nothing was saved.",
      );
    }

    writeSessionFile(outFile, state);
  } finally {
    await browser.close();
  }
}

/** Write with restrictive permissions from the start, never widen them after. */
function writeSessionFile(outFile: string, state: unknown): void {
  fs.writeFileSync(outFile, JSON.stringify(state, null, 2), { mode: SESSION_FILE_MODE });
  // writeFileSync's mode is masked by umask and ignored if the file already
  // existed, so state the permissions rather than assume them.
  fs.chmodSync(outFile, SESSION_FILE_MODE);
}

async function defaultWaitForEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await rl.question("\n  Log in in the browser window, then press Enter here to save the session… ");
  } finally {
    rl.close();
  }
}

/**
 * Check a session file before an expensive run reads it.
 *
 * Returns the path for Playwright to load. Refuses rather than silently running
 * logged-out, because a logged-out run produces a confident report about a login
 * page and bills for it.
 */
export function resolveSessionFile(file: string): string {
  if (!fs.existsSync(file)) {
    throw new SessionError(
      `No session file at "${file}". Create one with:  mpersonas auth <url> --save ${file}`,
    );
  }

  const stat = fs.statSync(file);
  if ((stat.mode & 0o077) !== 0) {
    throw new SessionError(
      `Session file "${file}" is readable by other users. It contains live login cookies. Fix with:  chmod 600 ${file}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new SessionError(`Session file "${file}" is not valid JSON. Re-create it with: mpersonas auth`);
  }

  const state = parsed as { cookies?: unknown[]; origins?: unknown[] };
  if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
    throw new SessionError(`Session file "${file}" is not a session. Re-create it with: mpersonas auth`);
  }
  if (state.cookies.length === 0 && state.origins.length === 0) {
    throw new SessionError(`Session file "${file}" is empty — no login was captured.`);
  }

  return file;
}

/**
 * Whether a saved session still authenticates against the target.
 *
 * Sessions expire. Without this the first sign of a stale session is a report
 * full of findings about a login page, which reads exactly like a broken site.
 * Cheap to check, so check before spending money on personas.
 */
export async function sessionIsLive(
  url: string,
  sessionFile: string,
  options: { allowPrivate?: boolean } = {},
): Promise<boolean> {
  const safeUrl = await assertUrlAllowed(url, { allowPrivate: options.allowPrivate });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: sessionFile });
    const page = await context.newPage();
    await page.goto(safeUrl.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    return !looksLikeLogin(page.url(), await page.title());
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Heuristic, and deliberately only used to warn.
 *
 * A false positive here must never abort a legitimate run, so callers treat a
 * true result as "warn the user", not "stop".
 */
export function looksLikeLogin(currentUrl: string, title: string): boolean {
  const haystack = `${currentUrl} ${title}`.toLowerCase();
  return /\b(login|log-in|signin|sign-in|auth\/|authenticate|sso)\b/.test(haystack);
}
