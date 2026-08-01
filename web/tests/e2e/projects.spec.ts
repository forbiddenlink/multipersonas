import { test, expect } from "@playwright/test";

// The projects surface lists the caller's own projects (RLS-scoped). Proves the
// seeded project renders for its owner.
test("projects page lists the seeded project", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole("link", { name: /Acme Marketing Site/ })).toBeVisible();
});
