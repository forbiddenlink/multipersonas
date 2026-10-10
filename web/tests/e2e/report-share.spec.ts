import { test, expect } from "@playwright/test";

// Owner creates a share link, a signed-out visitor opens it read-only, the owner revokes
// it, and the same URL then reads as inactive. Serial: the steps share one run.
test.describe.configure({ mode: "serial" });

test.describe("report share link (gated owner, anonymous visitor)", () => {
  test("create, view signed-out, revoke", async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "stateful flow: run once");

    await page.goto("/dashboard");
    const link = page.getByRole("link", {
      name: /View details for the audit of acme\.example\.com/,
    });
    await Promise.all([page.waitForURL(/\/audits\/[0-9a-f-]+(?:\?|$)/), link.click()]);
    const detailPath = new URL(page.url()).pathname;
    await page.goto(`${detailPath}/report`);

    const control = page.getByTestId("share-link-control");
    // Start from a known state: revoke a link left by an earlier run.
    if (await control.getByRole("button", { name: "Revoke link" }).isVisible()) {
      await control.getByRole("button", { name: "Revoke link" }).click();
    }
    await expect(control.getByText(/expires after 30 days/)).toBeVisible();

    await control.getByRole("button", { name: "Create share link" }).click();
    const field = control.getByRole("textbox", { name: "Share link" });
    await expect(field).toBeVisible();
    await expect(control.getByText(/until /)).toBeVisible();
    const shareUrl = await field.inputValue();
    expect(shareUrl).toMatch(/\/r\/[A-Za-z0-9_-]{43}$/);

    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const visitorPage = await visitor.newPage();
    const ok = await visitorPage.goto(shareUrl);
    expect(ok?.status()).toBe(200);
    expect(ok?.headers()["cache-control"]).toBe("no-store");
    expect(ok?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(ok?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(visitorPage.getByRole("heading", { name: /Accessibility Report/ })).toBeVisible();
    await expect(visitorPage.getByText("Shared report. This page is read-only.")).toBeVisible();
    await expect(visitorPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await control.getByRole("button", { name: "Revoke link" }).click();
    await expect(control.getByText("The previous link was revoked.")).toBeVisible();

    const gone = await visitorPage.goto(shareUrl);
    expect(gone?.status()).toBe(404);
    await expect(visitorPage.getByRole("heading", { name: "This link is no longer active" })).toBeVisible();
    await visitor.close();
  });
});
