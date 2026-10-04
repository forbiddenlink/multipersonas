import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("project creation, plan-limit feedback, edits, and deletion survive reload", async ({ page }) => {
  const url = process.env.SUPABASE_URL ?? "";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error("Project lifecycle fixtures require local Supabase");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `project-${randomUUID()}@personaudit.test`;
  const password = "Synthetic-Project-Test-Password1!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error("Could not create isolated project fixture");

  try {
    await page.context().clearCookies();
    await page.goto("/auth/login?returnTo=/projects");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByLabel("Name", { exact: true }).fill("Lifecycle fixture");
    await page.getByLabel("URL", { exact: true }).fill("https://example.com");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    const projectUrl = page.url();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Lifecycle fixture", exact: true })).toBeVisible();

    await page.goto("/projects");
    await page.getByLabel("Name", { exact: true }).fill("Over the allowance");
    await page.getByLabel("URL", { exact: true }).fill("https://example.org");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Your plan includes" }))
      .toHaveText("Your plan includes 1 project. See pricing to add more.");
    await expect(page.getByRole("link", { name: "Over the allowance", exact: true })).toHaveCount(0);

    await page.goto(projectUrl);
    await page.getByLabel("Name", { exact: true }).fill("Renamed fixture");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Renamed fixture", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Renamed fixture", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete project", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Delete project", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delete project", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.reload();
    await expect(page.getByText("No projects yet.", { exact: true })).toBeVisible();
    const { count, error: countError } = await admin.from("projects")
      .select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
    expect(countError).toBeNull();
    expect(count).toBe(0);
  } finally {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
    if (cleanupError) throw new Error("Could not remove isolated project fixture");
  }
});
