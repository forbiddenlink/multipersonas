import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright";
import { trimToWindow, HISTORY_WINDOW, executeAction } from "./engine.js";

/**
 * Minimal fake Page for the click path. `resolveElement` tries an aria-ref
 * locator first (when the selector looks like e12), then getByRole.
 * `touched` records whether the page was queried at all, so a blocked click
 * can be proven to short-circuit before any element resolution.
 */
function fakePage(opts: { innerText?: string; ariaLabel?: string | null } = {}) {
  const state = {
    clicked: false,
    touched: false,
    locatorArg: undefined as string | undefined,
    roleQueried: false,
  };
  const locator = {
    count: async () => 1,
    first: () => ({
      click: async () => { state.clicked = true; },
      getAttribute: async (n: string) =>
        n === "aria-label" ? (opts.ariaLabel ?? null) : null,
      innerText: async () => opts.innerText ?? "",
    }),
  };
  const touch = () => {
    state.touched = true;
    return locator;
  };
  const page = {
    getByRole: () => {
      state.roleQueried = true;
      state.touched = true;
      return locator;
    },
    getByLabel: touch,
    getByText: touch,
    getByPlaceholder: touch,
    locator: (sel?: string) => {
      state.locatorArg = sel;
      state.touched = true;
      return locator;
    },
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

describe("executeAction — aria-ref targeting", () => {
  it("clicks via aria-ref when the selector is a snapshot ref", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(page, "click", { selector: "e12" });
    expect(result).toBe('Clicked "e12"');
    expect(state.locatorArg).toBe("aria-ref=e12");
    expect(state.roleQueried).toBe(false);
    expect(state.clicked).toBe(true);
  });

  it("does not treat an accessible name as a ref", async () => {
    const { page, state } = fakePage();
    await executeAction(page, "click", { selector: "Place Order" });
    expect(state.roleQueried).toBe(true);
    expect(state.locatorArg).toBeUndefined();
  });
});

describe("executeAction — risk-aversion confirm + ref denylist", () => {
  it("pauses a cautious persona on the first irreversible click, then proceeds", async () => {
    const { page, state } = fakePage({ innerText: "Place Order" });
    const irreversibleConfirm = { pending: null as string | null };
    const first = await executeAction(
      page,
      "click",
      { selector: "Place Order" },
      { riskAversion: 0.7, irreversibleConfirm },
    );
    expect(first).toMatch(/paused to re-read/i);
    expect(first).toContain("Place Order");
    expect(state.clicked).toBe(false);
    expect(irreversibleConfirm.pending).toBe("Place Order");

    const second = await executeAction(
      page,
      "click",
      { selector: "Place Order" },
      { riskAversion: 0.7, irreversibleConfirm },
    );
    expect(second).toBe('Clicked "Place Order"');
    expect(state.clicked).toBe(true);
    expect(irreversibleConfirm.pending).toBeNull();
  });

  it("does not pause a neutral-risk persona (legacy default)", async () => {
    const { page, state } = fakePage({ innerText: "Place Order" });
    const result = await executeAction(
      page,
      "click",
      { selector: "Place Order" },
      { riskAversion: 0.5 },
    );
    expect(result).toBe('Clicked "Place Order"');
    expect(state.clicked).toBe(true);
  });

  it("blocks a destructive aria-ref click by the element's accessible name", async () => {
    const { page, state } = fakePage({ innerText: "Place Order" });
    const result = await executeAction(
      page,
      "click",
      { selector: "e12" },
      { blockDestructiveActions: true },
    );
    expect(result.toLowerCase()).toContain("irreversible");
    expect(state.locatorArg).toBe("aria-ref=e12");
    expect(state.clicked).toBe(false);
  });
});

describe("engine source guards (axe-feed + AI snapshot refs)", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/agent/engine.ts"), "utf-8");

  it("takes an AI-mode aria snapshot so interactable nodes carry [ref=eN]", () => {
    expect(src).toMatch(/ariaSnapshot\(\{\s*mode:\s*["']ai["']/);
  });

  it("feeds current-page axe verdicts to the model as read-only ground truth", () => {
    expect(src).toMatch(/formatKnownAxeForPage/);
    // Injected after the untrusted page fence so axe text is ours, not the page's.
    const fence = src.lastIndexOf("</untrusted-page-content>");
    const feed = src.indexOf("formatKnownAxeForPage(axeFindings");
    expect(feed).toBeGreaterThan(fence);
  });

  it("resolves snapshot refs through Playwright's aria-ref locator", () => {
    expect(src).toMatch(/parseAriaRef/);
    expect(src).toMatch(/ariaRefLocator/);
  });
});
