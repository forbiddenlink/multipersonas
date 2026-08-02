import { describe, it, expect } from "vitest";
import {
  isDestructiveAction,
  destructiveActionRefusal,
  DESTRUCTIVE_ACTION_PHRASES,
} from "./action-guard.js";

describe("isDestructiveAction", () => {
  it("blocks order/payment completion controls", () => {
    for (const name of [
      "Place Order",
      "Place your order",
      "Buy Now",
      "Pay now",
      "Confirm and pay",
      "Complete Purchase",
      "Submit order",
      "Confirm order",
    ]) {
      expect(isDestructiveAction(name), name).toBe(true);
    }
  });

  it("blocks destructive account and subscription actions", () => {
    for (const name of [
      "Delete account",
      "Delete my account",
      "Close Account",
      "Cancel subscription",
      "Cancel my plan",
      "Permanently delete",
    ]) {
      expect(isDestructiveAction(name), name).toBe(true);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isDestructiveAction("  PLACE   ORDER  ")).toBe(true);
    expect(isDestructiveAction("place your order now")).toBe(true);
  });

  it("allows reversible steps that lead up to the point of no return", () => {
    for (const name of [
      "Add to cart",
      "Proceed to checkout",
      "Checkout",
      "Continue",
      "Next",
      "Save",
      "Delete this filter",
      "Remove item from cart",
      "Edit shipping address",
      "Apply coupon",
    ]) {
      expect(isDestructiveAction(name), name).toBe(false);
    }
  });

  it("does not trip on empty or whitespace-only names", () => {
    expect(isDestructiveAction("")).toBe(false);
    expect(isDestructiveAction("   ")).toBe(false);
  });

  it("every denylist phrase matches itself", () => {
    for (const phrase of DESTRUCTIVE_ACTION_PHRASES) {
      expect(isDestructiveAction(phrase), phrase).toBe(true);
    }
  });
});

describe("destructiveActionRefusal", () => {
  it("names the control and frames reaching it as completion", () => {
    const msg = destructiveActionRefusal("Place Order");
    expect(msg).toContain("Place Order");
    expect(msg.toLowerCase()).toContain("counts as completing");
  });
});
