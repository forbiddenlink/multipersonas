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
  await expect(page.getByText("latest open")).toBeVisible();
  await expect(page.getByText("persona outcome")).toBeVisible();
});
