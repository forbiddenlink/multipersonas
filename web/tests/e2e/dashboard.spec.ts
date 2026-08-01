import { test, expect } from "@playwright/test";

// Calibration slice: proves the whole gated-app harness works end to end —
// storageState auth carries a real session, the gated route renders instead of
// bouncing to login, and RLS-scoped data seeded for this user comes back.
test.describe("dashboard (gated)", () => {
  test("renders for an authenticated user and shows their seeded run", async ({ page }) => {
    await page.goto("/dashboard");

    // Not redirected to /auth/login — the session cookie is valid.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    // The seeded, RLS-scoped run is readable as this user.
    await expect(page.getByText("acme.example.com").first()).toBeVisible();
  });

  test("an unauthenticated visitor sees no other user's data (RLS holds)", async ({ browser }) => {
    // The app has no server-side redirect gate: the dashboard shell renders for anyone.
    // The real security property is RLS — a logged-out visitor must never see the seeded
    // user's private run. That is what this asserts, not page reachability.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page.getByText("acme.example.com")).toHaveCount(0);
    await context.close();
  });
});
