import { test, expect } from "@playwright/test";

// The projects surface lists the caller's own projects (RLS-scoped). Proves the
// seeded project renders for its owner.
test("projects page lists the seeded project", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/projects/);
  const project = page.getByRole("link", { name: /Acme Marketing Site/ });
  await expect(project).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/projects\/[0-9a-f-]+$/),
    project.click(),
  ]);
  // The seeded owner is on Free: the page keeps the free grades and names paid features once,
  // instead of showing paid-only panels it cannot use.
  await expect(page.getByRole("link", { name: "Grade this site free" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "On Solo and up" })).toBeVisible();
});
