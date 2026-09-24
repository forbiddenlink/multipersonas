import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

// /docs carries the install and CI snippets, so it has the same overflowing code
// blocks as the marketing pages and needs the same keyboard guarantee.
for (const route of ["/", "/for-agencies", "/docs"]) {
  test(`${route} command example is keyboard-scrollable on mobile`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const result = await new AxeBuilder({ page }).withRules(["scrollable-region-focusable"]).analyze();
    expect(result.violations).toEqual([]);
    // axe above judges every block on the page; the scroll proof runs on the first,
    // which is the one guaranteed to overflow at this viewport.
    const example = page.locator("pre").first();
    await example.focus();
    await expect(example).toBeFocused();
    await example.press("ArrowRight");
    await expect.poll(() => example.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
}
