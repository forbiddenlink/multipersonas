import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

// Each route names the code block to drive, because the assertion below only means
// something on a block that actually overflows 390px. Picking "the first pre" put a
// borderline one under test on /docs -- 43 characters, which wrapped locally and did
// not in CI -- so the block is chosen by label and by its longest line instead.
const ROUTES: { route: string; block: string }[] = [
  // "personaudit scan https://app.client.com --session ./session.json" -- 65 chars.
  { route: "/", block: "Crawl every reachable state command" },
  { route: "/for-agencies", block: "Scan the client site command" },
  // "npx personaudit scan https://app.example.com --session ./session.json \\" -- 71 chars.
  { route: "/docs", block: "in CI, exit non-zero only on new defects command" },
];

for (const { route, block } of ROUTES) {
  test(`${route} command example is keyboard-scrollable on mobile`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    // axe judges every scrollable region on the page, not just the one driven below.
    const result = await new AxeBuilder({ page }).withRules(["scrollable-region-focusable"]).analyze();
    expect(result.violations).toEqual([]);
    const example = page.getByRole("region", { name: block });
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
