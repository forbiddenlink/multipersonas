import { chromium, type FullConfig } from "@playwright/test";
import { TEST_USER, STORAGE_STATE } from "./constants";

// Sign in the seeded test user through the real login form (which writes the
// @supabase/ssr auth cookies the server client reads), then persist the cookie
// state so every spec starts authenticated. Token injection would not work — the
// app authenticates via cookies, not a localStorage session.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${baseURL}/auth/login`);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // Redirect to /dashboard confirms the session cookies are set.
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
