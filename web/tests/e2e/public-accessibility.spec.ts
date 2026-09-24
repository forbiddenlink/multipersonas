import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

// Each route names the code block to drive, because the assertion below only means
// something on a block that actually overflows 390px. Picking "the first pre" put a
// borderline one under test on /docs -- 43 characters, which wrapped locally and did
// not in CI -- so the block is chosen by label and by its longest line instead.
const ROUTES: { route: string; block?: string }[] = [
  { route: "/" },
  { route: "/for-agencies" },
  // "personaudit scan https://app.example.com --session ./session.json \" -- 66 chars,
  // comfortably past the viewport at text-xs monospace.
  { route: "/docs", block: "Baseline and gate commands" },
];

for (const { route, block } of ROUTES) {
  test(`${route} command example is keyboard-scrollable on mobile`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    // axe judges every scrollable region on the page, not just the one driven below.
    const result = await new AxeBuilder({ page }).withRules(["scrollable-region-focusable"]).analyze();
    expect(result.violations).toEqual([]);
    const example = block ? page.getByRole("region", { name: block }) : page.locator("pre");
    // Guard the premise: a block that fits has nothing to scroll, and asserting on it
    // would pass or fail on font metrics rather than on the behaviour under test.
    await expect
      .poll(() => example.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeGreaterThan(0);
    await example.focus();
    await expect(example).toBeFocused();
    await example.press("ArrowRight");
    await expect.poll(() => example.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
}
