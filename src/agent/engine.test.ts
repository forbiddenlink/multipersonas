import { describe, it, expect } from "vitest";
import type { Page } from "playwright";
import { trimToWindow, HISTORY_WINDOW, executeAction } from "./engine.js";

/**
 * Minimal fake Page for the click path. `resolveElement` tries getByRole first
 * and clicks the located element; `touched` records whether the page was
 * queried at all, so a blocked click can be proven to short-circuit before any
 * element resolution.
 */
function fakePage() {
  const state = { clicked: false, touched: false };
  const locator = {
    count: async () => 1,
    first: () => ({ click: async () => { state.clicked = true; } }),
  };
  const touch = () => {
    state.touched = true;
    return locator;
  };
  const page = {
    getByRole: touch,
    getByLabel: touch,
    getByText: touch,
    getByPlaceholder: touch,
    locator: touch,
  } as unknown as Page;
  return { page, state };
}

const user = (n: number) => ({ role: "user" as const, id: n });
const assistant = (n: number) => ({ role: "assistant" as const, id: n });

describe("trimToWindow", () => {
  it("returns the conversation untouched when it fits", () => {
    const messages = [user(1), assistant(1), user(2)];
    expect(trimToWindow(messages, 12)).toEqual(messages);
  });

  it("keeps only the trailing window once it overflows", () => {
    const messages = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0 ? user(i) : assistant(i),
    );
    const out = trimToWindow(messages, 12);
    expect(out.length).toBeLessThanOrEqual(12);
    // Must still end on the step we just pushed.
    expect(out.at(-1)).toEqual(messages.at(-1));
  });

  it("never starts the window on an assistant turn", () => {
    // A cut landing mid-exchange would leave a dangling assistant message,
    // which the API rejects.
    const messages = Array.from({ length: 21 }, (_, i) =>
      i % 2 === 0 ? assistant(i) : user(i),
    );
    for (const window of [2, 3, 4, 8, 12]) {
      const out = trimToWindow(messages, window);
      expect(out[0]!.role, `window=${window}`).toBe("user");
    }
  });

  it("falls back to the last message when the window holds no user turn", () => {
    const messages = [user(0), assistant(1), assistant(2), assistant(3)];
    const out = trimToWindow(messages, 2);
    expect(out).toEqual([assistant(3)]);
  });

  it("bounds input growth — a 30-step run sends a flat window, not the whole history", () => {
    // Regression guard for the quadratic-token bug: previously step N sent N
    // snapshots, so a 30-step persona sent ~535k input tokens.
    const messages: Array<{ role: "user" | "assistant"; id: number }> = [];
    const sizes: number[] = [];
    for (let step = 1; step <= 30; step++) {
      messages.push(user(step));
      sizes.push(trimToWindow(messages, HISTORY_WINDOW).length);
      messages.push(assistant(step));
    }
    expect(Math.max(...sizes)).toBeLessThanOrEqual(HISTORY_WINDOW);
    // Flat, not growing: the last step sends no more than an early one.
    expect(sizes.at(-1)).toBeLessThanOrEqual(HISTORY_WINDOW);
  });
});

describe("executeAction — destructive-action guard wiring", () => {
  it("refuses a destructive click and never touches the page when enabled", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(
      page,
      "click",
      { selector: "Place Order" },
      { blockDestructiveActions: true },
    );
    expect(result.toLowerCase()).toContain("irreversible");
    expect(state.clicked).toBe(false);
    expect(state.touched).toBe(false);
  });

  it("executes the same click when the guard is off (default)", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(page, "click", { selector: "Place Order" });
    expect(result).toBe('Clicked "Place Order"');
    expect(state.clicked).toBe(true);
  });

  it("does not block reversible clicks even when enabled", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(
      page,
      "click",
      { selector: "Add to cart" },
      { blockDestructiveActions: true },
    );
    expect(result).toBe('Clicked "Add to cart"');
    expect(state.clicked).toBe(true);
  });
});
