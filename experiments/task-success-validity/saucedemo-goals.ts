import type { LabeledGoal } from "./goals.js";

/**
 * Run 2 of task-success validity — a second, interaction-heavy target.
 *
 * THIS IS PRE-REGISTRATION CONTENT. The labels were committed before the run.
 * SauceDemo (https://www.saucedemo.com), signed in as `standard_user`, is a
 * public e-commerce sandbox: an add-to-cart → checkout flow, which is exactly
 * the kind of surface where task success matters most.
 *
 * Ground truth verified against the live site before committing: the account
 * menu has only All Items / About / Logout / Reset, and the page has no coupon,
 * order-history, wishlist, or account-settings surface anywhere. The achievable
 * goals map to controls that exist (add-to-cart buttons, sort dropdown, product
 * links, the checkout flow); the impossible goals map to features that do not.
 */
export const SAUCEDEMO_GOALS: LabeledGoal[] = [
  {
    id: "add-to-cart",
    goal: "Add a product to the shopping cart.",
    label: "achievable",
    rationale: "Every inventory item has an Add-to-cart button.",
  },
  {
    id: "view-cart",
    goal: "View the items currently in your cart.",
    label: "achievable",
    rationale: "The cart icon opens /cart.html for any signed-in user.",
  },
  {
    id: "complete-checkout",
    goal: "Buy an item: go through checkout to the order-confirmation page.",
    label: "achievable",
    rationale: "standard_user can complete the full checkout flow to /checkout-complete.html.",
  },
  {
    id: "sort-products",
    goal: "Sort the product list by price, low to high.",
    label: "achievable",
    rationale: "The inventory page has a sort dropdown with price ordering.",
  },
  {
    id: "view-product-detail",
    goal: "Open the detail page for a specific product.",
    label: "achievable",
    rationale: "Clicking a product name opens its /inventory-item.html detail page.",
  },
  {
    id: "apply-coupon",
    goal: "Apply a discount or coupon code to your order.",
    label: "impossible",
    rationale: "SauceDemo has no coupon or discount feature; nothing to find.",
  },
  {
    id: "order-history",
    goal: "View your past order history.",
    label: "impossible",
    rationale: "There is no order-history surface in the app.",
  },
  {
    id: "edit-account",
    goal: "Edit your account profile or change your password.",
    label: "impossible",
    rationale: "There is no account-settings page; the menu has no such entry.",
  },
  {
    id: "wishlist",
    goal: "Save an item to a wishlist for later.",
    label: "impossible",
    rationale: "SauceDemo has no wishlist or save-for-later feature.",
  },
  {
    id: "track-shipping",
    goal: "Track the shipping status of an order.",
    label: "impossible",
    rationale: "There is no shipment-tracking feature; checkout ends at a static confirmation.",
  },
];
