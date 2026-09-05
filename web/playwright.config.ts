import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./tests/e2e/constants";

// E2E for the auth-gated app, run against a LOCAL Supabase stack (see tests/e2e/run.sh).
// Build and serve production assets with the local stack's environment. Concurrent
// route compilation in the dev server can interrupt navigation during browser tests.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const REUSE_EXISTING_SERVER = process.env.E2E_REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "line",
  timeout: 30_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: STORAGE_STATE,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: REUSE_EXISTING_SERVER,
    timeout: 180_000,
  },
});
