import { test, expect } from "@playwright/test";

// The billable path: open a completed run from history, see its seeded findings,
// then reach the exportable compliance Report built from the axe verdicts.
test.describe("audit detail + report (gated)", () => {
  test("opening a run from history shows its seeded finding", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("link", { name: /View details for the audit of acme\.example\.com/ })
      .click();
    // Replay Theater deep-links the current moment via history.replaceState
    // (`?persona=…&step=…`) on mount, so tolerate an optional query string —
    // asserting the path, not that it stays bare (that races the effect).
    await expect(page).toHaveURL(/\/audits\/[0-9a-f-]+(?:\?|$)/);
    // The finding legitimately appears in both the replay evidence and the axe
    // verdicts list; assert the deterministic verdicts section specifically.
    await expect(page.getByRole("heading", { name: /Accessibility issues/ })).toBeVisible();
    await expect(page.getByText("Form input has no associated label").first()).toBeVisible();
  });

  test("the run's report renders as a compliance document", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("link", { name: /View details for the audit of acme\.example\.com/ })
      .click();
    await expect(page).toHaveURL(/\/audits\/[0-9a-f-]+(?:\?|$)/);
    // Build the report URL from the pathname only — page.url() may carry the
    // Replay deep-link query, which would corrupt `${url}/report`.
    const detailPath = new URL(page.url()).pathname;
    await page.goto(`${detailPath}/report`);
    await expect(page.getByRole("heading", { name: /Accessibility Report/ })).toBeVisible();
  });
});
