import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

for (const route of ["/", "/for-agencies"]) {
  test(`${route} command example is keyboard-scrollable on mobile`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const result = await new AxeBuilder({ page }).withRules(["scrollable-region-focusable"]).analyze();
    expect(result.violations).toEqual([]);
    const example = page.locator("pre");
    await example.focus();
    await expect(example).toBeFocused();
    await example.press("ArrowRight");
    await expect.poll(() => example.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
}
