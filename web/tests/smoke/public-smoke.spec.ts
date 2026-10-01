import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The routes a first-time visitor reaches. Gated app routes need a session and are
// covered by the e2e workflow instead.
const ROUTES = ["/", "/grade", "/pricing", "/sample-report", "/for-agencies"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function useTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
    } catch {
      /* the system theme applies */
    }
  }, theme);
}

for (const route of ROUTES) {
  for (const theme of ["light", "dark"] as const) {
    test(`${route} [${theme}] has no axe violations and no console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      await useTheme(page, theme);
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status()).toBe(200);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test(`${route} reflows at 390px with 200% text`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "load" });
    // WCAG 1.4.4: text resized to 200% with no loss of content or function.
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const clipped: string[] = [];
      document.querySelectorAll("a, button, input, select, textarea, summary, h1, h2, h3, label").forEach((el) => {
        const style = getComputedStyle(el);
        const hides = style.overflowX === "hidden" || style.overflowX === "clip";
        // Skip visually hidden text (skip link, screen-reader headings): clipped on purpose.
        if (hides && style.display !== "inline" && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1) {
          clipped.push(`${el.tagName.toLowerCase()}: ${(el.textContent ?? "").trim().slice(0, 40)}`);
        }
      });
      return { horizontalOverflow: root.scrollWidth - root.clientWidth, clipped };
    });
    expect(result.horizontalOverflow).toBeLessThanOrEqual(0);
    expect(result.clipped).toEqual([]);
  });
}

// A filled button must not paint its label in its own background colour. axe cannot see
// this when a stylesheet rule overrides the label colour, so compare the computed colours.
const GUIDES = [
  "/guides/wcag-checklist",
  "/guides/common-accessibility-issues",
  "/guides/screen-reader-testing",
  "/guides/ci-accessibility-gate",
  "/guides/accessibility-deadlines",
];
for (const route of [...ROUTES, ...GUIDES]) {
  test(`${route} filled buttons have a legible label`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    const same = await page.$$eval('a[class*="bg-primary"], button[class*="bg-primary"]', (els) =>
      els
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.color === s.backgroundColor;
        })
        .map((el) => (el.textContent ?? "").trim()),
    );
    expect(same).toEqual([]);
  });
}

// A printed grade drops the site chrome and carries its own graded-URL line. The grade
// page needs a stored scan, so this drives the same classes on a public page.
test("print emulation hides site chrome and shows the graded-URL line", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => {
    // The page wrapper holds the header, main and footer as direct children.
    const root = document.querySelector("main")?.parentElement;
    root?.classList.add("grade-print-root");
    const meta = document.createElement("p");
    meta.className = "grade-print-meta";
    meta.textContent = "Graded https://example.com on 2026-01-01";
    document.querySelector("main")?.prepend(meta);
  });
  const header = page.locator(".grade-print-root > header");
  const footer = page.locator(".grade-print-root > footer");
  const meta = page.locator(".grade-print-meta");
  await expect(header).toBeVisible();
  await expect(meta).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(header).toBeHidden();
  await expect(footer).toBeHidden();
  await expect(meta).toBeVisible();
});
