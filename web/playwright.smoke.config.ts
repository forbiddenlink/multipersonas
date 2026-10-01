import { defineConfig, devices } from "@playwright/test";

// Pull-request smoke for the public surface: axe, reflow at 390px with 200% text, and
// console errors. Unlike playwright.config.ts it needs no Supabase stack and no signed-in
// session, so it runs against any already-started production server (SMOKE_URL), the way
// scripts/axe-dogfood.mjs does in the a11y-dogfood workflow.
const BASE_URL = process.env.SMOKE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "line",
  timeout: 30_000,
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
