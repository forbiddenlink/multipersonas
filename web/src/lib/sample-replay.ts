/**
 * The home hero's replay data. Everything here is copied from one stored run:
 * experiments/task-success-validity/results-saucedemo/run.json (10 single-goal persona runs
 * on the SauceDemo store, goals and expected answers pre-registered in saucedemo-goals.ts).
 *
 * What the stored run keeps per goal: the goal, a step count out of a 20-step budget, the
 * verdict, and the persona's own written summary. It does NOT keep a per-step transcript or
 * per-step page captures. So the "moments" below are the steps the persona itself narrated
 * in that summary, quoted word for word (em dashes in the originals are written as hyphens here; cut only at sentence ends, marked with "..."), in
 * the order it wrote them. They are not mapped onto step numbers, and the page shown with a
 * moment is the URL and page description the persona gave, not a screenshot. The `kind`
 * tag is this site's reading of what the persona said it did.
 *
 * Personas here report whether a goal was reachable. Nothing in this file is an
 * accessibility verdict; that is the axe-core lane (SAMPLE_VERDICTS in sample-evidence.ts,
 * SAUCEDEMO_TRAIL in probe-ledger.ts, from experiments/net-new-violations).
 */

export const REPLAY_STEP_BUDGET = 20;

export type MomentKind = 'navigate' | 'click' | 'type' | 'stuck' | 'result';

export interface ReplayMoment {
  kind: MomentKind;
  /** Quoted from the persona's own summary. */
  said: string;
  /** The page the persona named at this moment, when its summary names one. */
  page: string | null;
}

export interface ReplayRun {
  id: string;
  goal: string;
  /** Pre-registered answer: can this goal be reached on the site at all? */
  reachable: boolean;
  verdict: 'achieved' | 'blocked';
  steps: number;
  /** Set when the stored summary says the persona never finished. */
  noFinish?: boolean;
  moments: readonly ReplayMoment[];
}

export const REPLAY_SITE = 'saucedemo.com (a public demo store)';

export const REPLAY_RUNS: readonly ReplayRun[] = [
  {
    id: 'add-to-cart',
    goal: 'Add a product to the shopping cart.',
    reachable: true,
    verdict: 'achieved',
    steps: 2,
    moments: [
      {
        kind: 'result',
        said: 'Task: Add a product to the shopping cart - SUCCEEDED.',
        page: 'inventory page',
      },
    ],
  },
  {
    id: 'view-cart',
    goal: 'View the items currently in your cart.',
    reachable: true,
    verdict: 'achieved',
    steps: 3,
    moments: [
      {
        kind: 'navigate',
        said: 'I had to navigate directly via URL (saucedemo.com/cart.html) to reach the cart page instead of clicking a link.',
        page: 'saucedemo.com/cart.html',
      },
      { kind: 'result', said: 'Goal was to view items currently in the cart.', page: 'Cart page' },
    ],
  },
  {
    id: 'complete-checkout',
    goal: 'Buy an item: go through checkout to the order-confirmation page.',
    reachable: true,
    verdict: 'achieved',
    steps: 10,
    moments: [
      {
        kind: 'type',
        said: 'Filled in checkout information (First Name: John, Last Name: Doe, Zip: 12345) on checkout-step-one.html and clicked Continue - succeeded, moved to Overview step.',
        page: 'checkout-step-one.html',
      },
      {
        kind: 'click',
        said: 'Reviewed order overview (item, payment info, shipping info, price breakdown) on checkout-step-two.html and clicked Finish - succeeded.',
        page: 'checkout-step-two.html',
      },
      {
        kind: 'result',
        said: 'Landed on checkout-complete.html showing "Thank you for your order!" confirmation - goal achieved.',
        page: 'checkout-complete.html',
      },
    ],
  },
  {
    id: 'sort-products',
    goal: 'Sort the product list by price, low to high.',
    reachable: true,
    verdict: 'blocked',
    steps: 20,
    noFinish: true,
    moments: [
      {
        kind: 'stuck',
        said: '(no explicit finish)',
        page: null,
      },
    ],
  },
  {
    id: 'view-product-detail',
    goal: 'Open the detail page for a specific product.',
    reachable: true,
    verdict: 'achieved',
    steps: 2,
    moments: [
      {
        kind: 'click',
        said: 'Successfully navigated to the product detail page for "Sauce Labs Backpack" (https://www.saucedemo.com/inventory-item.html?id=4) by clicking its name/link from the inventory listing page.',
        page: 'inventory-item.html?id=4',
      },
    ],
  },
  {
    id: 'apply-coupon',
    goal: 'Apply a discount or coupon code to your order.',
    reachable: false,
    verdict: 'blocked',
    steps: 20,
    moments: [
      {
        kind: 'navigate',
        said: 'Started at the cart page (cart.html) with one item (Sauce Labs Backpack, $29.99) already in the cart.',
        page: 'cart.html',
      },
      {
        kind: 'stuck',
        said: 'Searched the cart page for any coupon/promo code field or link - none was present.',
        page: 'cart.html',
      },
      {
        kind: 'click',
        said: 'Proceeded to Checkout, reasoning that a coupon field is commonly located during the checkout information or payment/overview step.',
        page: 'checkout-step-one.html',
      },
      {
        kind: 'stuck',
        said: 'On "Checkout: Your Information" step, the only fields shown are First Name, Last Name, and Zip/Postal Code - no coupon or discount code field visible here either.',
        page: 'checkout-step-one.html',
      },
      {
        kind: 'type',
        said: 'Filled in First Name (Test) and Last Name (User) to continue toward the next step (Overview), where a coupon field might plausibly appear, but ran out of step budget (20/20) before reaching checkout-step-two/overview page to confirm.',
        page: 'checkout-step-one.html',
      },
      {
        kind: 'result',
        said: 'Outcome: BLOCKED - I was not able to locate any coupon/discount code entry point on the cart page or the first checkout step, and ran out of allotted steps before reaching the order overview page to check there as well.',
        page: null,
      },
    ],
  },
  {
    id: 'order-history',
    goal: 'View your past order history.',
    reachable: false,
    verdict: 'blocked',
    steps: 17,
    moments: [
      {
        kind: 'result',
        said: 'Conclusion: This site (a QA testing demo application) does not implement any order history / past purchases feature at all.',
        page: null,
      },
    ],
  },
  {
    id: 'edit-account',
    goal: 'Edit your account profile or change your password.',
    reachable: false,
    verdict: 'blocked',
    steps: 16,
    moments: [
      {
        kind: 'result',
        said: 'Result: FAILED / BLOCKED - the site does not provide any account profile editing or password change functionality.',
        page: null,
      },
    ],
  },
  {
    id: 'wishlist',
    goal: 'Save an item to a wishlist for later.',
    reachable: false,
    verdict: 'blocked',
    steps: 8,
    moments: [
      {
        kind: 'result',
        said: 'Result: FAILED/BLOCKED - no wishlist feature exists on this site.',
        page: null,
      },
    ],
  },
  {
    id: 'track-shipping',
    goal: 'Track the shipping status of an order.',
    reachable: false,
    verdict: 'blocked',
    steps: 6,
    moments: [
      {
        kind: 'result',
        said: 'Result: Blocked / Not achievable.',
        page: null,
      },
    ],
  },
] as const;

/** A verdict matches when a reachable goal was achieved or an unreachable one was blocked. */
export function matchesExpected(run: ReplayRun): boolean {
  return run.reachable === (run.verdict === 'achieved');
}

export function replayTally(): { matched: number; total: number } {
  return { matched: REPLAY_RUNS.filter(matchesExpected).length, total: REPLAY_RUNS.length };
}

/**
 * The axe-core lane: SauceDemo crawl states in order (SAUCEDEMO_TRAIL) paired with the
 * stored finding for each state that has one (SAMPLE_VERDICTS). Separate run, separate
 * instrument: no link to the persona runs above is claimed.
 */
export const AXE_LANE_FINDINGS: Record<string, { ruleId: string; wcag: string; help: string }> = {
  'Login error': {
    ruleId: 'button-name',
    wcag: '4.1.2',
    help: 'Buttons must have discernible text',
  },
  Inventory: {
    ruleId: 'select-name',
    wcag: '4.1.2',
    help: 'Select element must have an accessible name',
  },
  'Checkout error': {
    ruleId: 'button-name',
    wcag: '4.1.2',
    help: 'Buttons must have discernible text',
  },
};
