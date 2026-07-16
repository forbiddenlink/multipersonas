import type { Page } from "playwright";

/**
 * Targets are declared here, before any run, so they cannot be cherry-picked
 * after seeing results. See README.md.
 *
 * Ethics/scope: only drive states that cause no side effects for anyone else.
 * Sites explicitly published as automation targets (saucedemo) may be driven
 * through checkout. Real sites get cart/modal/validation states only — never a
 * completed order.
 */

export interface DeepState {
  /** Short stable name; appears in the report. */
  name: string;
  /** Drive the page from the entry URL into this state. Throw to record an error. */
  reach: (page: Page) => Promise<void>;
  /** Why a crawler cannot see this state. Forces us to justify each one. */
  whyCrawlerMisses: string;
}

export interface Target {
  id: string;
  url: string;
  /** Why this target is legitimate to drive. */
  note: string;
  /** Runs once after load, before the baseline scan (e.g. dismiss a cookie wall). */
  setup?: (page: Page) => Promise<void>;
  states: DeepState[];
}

/** Sauce Labs' Swag Labs — published expressly as an automation practice target. */
const saucedemo: Target = {
  id: "saucedemo",
  url: "https://www.saucedemo.com/",
  note: "Published by Sauce Labs as a public automation target. Credentials are printed on the login page itself. Driving checkout here harms nobody.",
  states: [
    {
      name: "login-error",
      whyCrawlerMisses: "Only exists after submitting the form with bad input.",
      reach: async (page) => {
        await page.fill("#user-name", "locked_out_user");
        await page.fill("#password", "wrong_password");
        await page.click("#login-button");
        await page.waitForSelector('[data-test="error"]', { timeout: 10_000 });
      },
    },
    {
      name: "inventory",
      whyCrawlerMisses: "Behind auth. A crawler with no session never sees it.",
      reach: async (page) => {
        await login(page);
        await page.waitForSelector(".inventory_list", { timeout: 10_000 });
      },
    },
    {
      name: "cart",
      whyCrawlerMisses: "Requires adding an item first — a state change, not a URL.",
      reach: async (page) => {
        await login(page);
        await page.click('[data-test^="add-to-cart"]');
        await page.click(".shopping_cart_link");
        await page.waitForSelector(".cart_list", { timeout: 10_000 });
      },
    },
    {
      name: "checkout-step-one",
      whyCrawlerMisses: "Three interactions deep; unreachable without a cart.",
      reach: async (page) => {
        await login(page);
        await page.click('[data-test^="add-to-cart"]');
        await page.click(".shopping_cart_link");
        await page.click('[data-test="checkout"]');
        await page.waitForSelector('[data-test="firstName"]', { timeout: 10_000 });
      },
    },
    {
      name: "checkout-validation-error",
      whyCrawlerMisses: "An error state inside a multi-step flow. This is the exact class of state litigation targets.",
      reach: async (page) => {
        await login(page);
        await page.click('[data-test^="add-to-cart"]');
        await page.click(".shopping_cart_link");
        await page.click('[data-test="checkout"]');
        await page.click('[data-test="continue"]'); // submit empty
        await page.waitForSelector('[data-test="error"]', { timeout: 10_000 });
      },
    },
    {
      name: "checkout-overview",
      whyCrawlerMisses: "Four interactions deep. No crawler reaches this.",
      reach: async (page) => {
        await login(page);
        await page.click('[data-test^="add-to-cart"]');
        await page.click(".shopping_cart_link");
        await page.click('[data-test="checkout"]');
        await page.fill('[data-test="firstName"]', "Test");
        await page.fill('[data-test="lastName"]', "Test");
        await page.fill('[data-test="postalCode"]', "12345");
        await page.click('[data-test="continue"]');
        await page.waitForSelector(".summary_info", { timeout: 10_000 });
      },
    },
    {
      name: "burger-menu-open",
      whyCrawlerMisses: "Content hidden behind an interaction; absent from the initial DOM paint.",
      reach: async (page) => {
        await login(page);
        await page.click("#react-burger-menu-btn");
        await page.waitForSelector(".bm-menu-wrap", { state: "visible", timeout: 10_000 });
      },
    },
  ],
};

async function login(page: Page): Promise<void> {
  await page.fill("#user-name", "standard_user");
  await page.fill("#password", "secret_sauce");
  await page.click("#login-button");
  await page.waitForSelector(".inventory_list", { timeout: 10_000 });
}

/** Public teaching site of intentionally tricky UI states. No transactions exist. */
const theInternet: Target = {
  id: "the-internet",
  url: "https://the-internet.herokuapp.com/",
  note: "Public teaching sandbox (Dave Haeffner). No side effects possible.",
  states: [
    {
      name: "js-modal",
      whyCrawlerMisses: "Modal only exists after a click.",
      reach: async (page) => {
        await page.goto("https://the-internet.herokuapp.com/entry_ad");
        await page.waitForSelector(".modal", { state: "visible", timeout: 10_000 });
      },
    },
    {
      name: "dynamic-controls-after-toggle",
      whyCrawlerMisses: "Controls appear/disappear only after interaction.",
      reach: async (page) => {
        await page.goto("https://the-internet.herokuapp.com/dynamic_controls");
        await page.click('#checkbox-example button');
        await page.waitForSelector("#message", { timeout: 10_000 });
      },
    },
    {
      name: "login-failure-flash",
      whyCrawlerMisses: "Flash error only renders after a failed POST.",
      reach: async (page) => {
        await page.goto("https://the-internet.herokuapp.com/login");
        await page.fill("#username", "wrong");
        await page.fill("#password", "wrong");
        await page.click('button[type="submit"]');
        await page.waitForSelector("#flash", { timeout: 10_000 });
      },
    },
  ],
};

/**
 * OrangeHRM — the most important target here. Unlike saucedemo, this is a REAL
 * production HR product (open source, thousands of installs) whose vendor
 * publishes a demo instance for exactly this kind of testing. Its shape is the
 * shape of the market: a login page out front, an entire application behind it.
 * If a crawler is blind here, it is blind on every SaaS product.
 */
const orangeHrm: Target = {
  id: "orangehrm",
  url: "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login",
  note: "Vendor-published demo of a real open-source HR product. Credentials are printed on the login page. Data resets on a schedule; read-only states only.",
  states: [
    {
      name: "login-error",
      whyCrawlerMisses: "Only exists after a failed POST.",
      reach: async (page) => {
        await page.fill('input[name="username"]', "wrong");
        await page.fill('input[name="password"]', "wrong");
        await page.click('button[type="submit"]');
        await page.waitForSelector(".oxd-alert-content", { timeout: 15_000 });
      },
    },
    {
      name: "dashboard",
      whyCrawlerMisses: "Behind auth. The entire product is invisible to a crawler.",
      reach: async (page) => {
        await hrmLogin(page);
      },
    },
    {
      name: "admin-user-list",
      whyCrawlerMisses: "Two levels behind auth; a data grid a crawler never renders.",
      reach: async (page) => {
        await hrmLogin(page);
        await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers");
        await page.waitForSelector(".oxd-table", { timeout: 15_000 });
      },
    },
    {
      name: "add-user-form",
      whyCrawlerMisses: "A real form, behind auth, never reached by a page crawler.",
      reach: async (page) => {
        await hrmLogin(page);
        await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/admin/saveSystemUser");
        await page.waitForSelector(".oxd-form", { timeout: 15_000 });
      },
    },
    {
      name: "add-user-validation-errors",
      whyCrawlerMisses: "Error state inside an authed form — the class of state litigation targets.",
      reach: async (page) => {
        await hrmLogin(page);
        await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/admin/saveSystemUser");
        await page.waitForSelector(".oxd-form", { timeout: 15_000 });
        await page.click('button[type="submit"]'); // submit empty
        await page.waitForSelector(".oxd-input-field-error-message", { timeout: 15_000 });
      },
    },
  ],
};

async function hrmLogin(page: Page): Promise<void> {
  await page.fill('input[name="username"]', "Admin");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForSelector(".oxd-topbar-header", { timeout: 20_000 });
}

/** Applitools' published demo app: login page out front, dashboard behind. */
const applitools: Target = {
  id: "applitools-demo",
  url: "https://demo.applitools.com/",
  note: "Published by Applitools as a public demo/testing target. Any credentials are accepted.",
  states: [
    {
      name: "dashboard",
      whyCrawlerMisses: "Behind a login form; a crawler stops at the door.",
      reach: async (page) => {
        await page.fill("#username", "test");
        await page.fill("#password", "test");
        await page.click("#log-in");
        await page.waitForSelector("table", { timeout: 15_000 });
      },
    },
  ],
};

export const targets: Target[] = [saucedemo, theInternet, orangeHrm, applitools];
