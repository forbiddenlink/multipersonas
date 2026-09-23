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
function fakePage(opts: {
  innerText?: string;
  ariaLabel?: string | null;
  placeholder?: string | null;
} = {}) {
  const state = {
    clicked: false,
    filled: false,
    touched: false,
    locatorArg: undefined as string | undefined,
    roleQueried: false,
  };
  const locator = {
    count: async () => 1,
    first: () => ({
      click: async () => { state.clicked = true; },
      fill: async () => { state.filled = true; },
      getAttribute: async (n: string) => {
        if (n === "aria-label") return opts.ariaLabel ?? null;
        if (n === "placeholder") return opts.placeholder ?? null;
        return null;
      },
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

describe("executeAction — tech-literacy visible-label targeting", () => {
  it("refuses an unlabeled click for a low-tech persona", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(
      page,
      "click",
      { selector: "e12" },
      { techLiteracy: 0 },
    );
    expect(result).toMatch(/no readable text label/i);
    expect(result).toMatch(/usability issue/i);
    expect(state.clicked).toBe(false);
  });

  it("refuses a symbol-only control, quoting what it reads as", async () => {
    const { page, state } = fakePage({ innerText: "×" });
    const result = await executeAction(
      page,
      "click",
      { selector: "e12" },
      { techLiteracy: 0.25 },
    );
    expect(result).toContain('it reads as "×"');
    expect(state.clicked).toBe(false);
  });

  it("allows a labeled click for a low-tech persona", async () => {
    const { page, state } = fakePage({ innerText: "Place Order" });
    const result = await executeAction(
      page,
      "click",
      { selector: "Place Order" },
      { techLiteracy: 0 },
    );
    expect(result).toBe('Clicked "Place Order"');
    expect(state.clicked).toBe(true);
  });

  it("does not gate a neutral-literacy persona (legacy default)", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(
      page,
      "click",
      { selector: "e12" },
      { techLiteracy: 0.5 },
    );
    expect(result).toBe('Clicked "e12"');
    expect(state.clicked).toBe(true);
  });

  it("refuses typing into an unlabeled input, but accepts a placeholder as a label", async () => {
    const unlabeled = fakePage();
    const refused = await executeAction(
      unlabeled.page,
      "type",
      { selector: "e3", text: "hi" },
      { techLiteracy: 0 },
    );
    expect(refused).toMatch(/no readable text label/i);
    expect(unlabeled.state.filled).toBe(false);

    const labeled = fakePage({ placeholder: "Email" });
    const ok = await executeAction(
      labeled.page,
      "type",
      { selector: "e3", text: "hi" },
      { techLiteracy: 0 },
    );
    expect(ok).toBe('Typed "hi" into "e3"');
    expect(labeled.state.filled).toBe(true);
  });

  it("records a jargon click as a misread for a low-tech persona, not a click", async () => {
    const { page, state } = fakePage({ innerText: "Sign in with SSO" });
    const result = await executeAction(
      page,
      "click",
      { selector: "Sign in with SSO" },
      { techLiteracy: 0 },
    );
    expect(result).toMatch(/^Misread recorded:/);
    expect(result).toContain("Sign in with SSO");
    expect(state.clicked).toBe(false);
  });

  it("allows a jargon click for a neutral-literacy persona", async () => {
    const { page, state } = fakePage({ innerText: "Sign in with SSO" });
    const result = await executeAction(
      page,
      "click",
      { selector: "Sign in with SSO" },
      { techLiteracy: 0.5 },
    );
    expect(result).toBe('Clicked "Sign in with SSO"');
    expect(state.clicked).toBe(true);
  });
});

describe("executeAction — misread / wrong_click (observation only)", () => {
  it("records a misread without clicking or filing a finding", async () => {
    const { page, state } = fakePage({ innerText: "SSO" });
    const result = await executeAction(page, "misread", {
      selector: "SSO",
      expected: "a search box",
      actual: "single sign-on",
    });
    expect(result).toMatch(/^Misread recorded:/);
    expect(result).toMatch(/not a click/i);
    expect(state.clicked).toBe(false);
    expect(state.touched).toBe(false);
  });

  it("rejects a misread missing required fields", async () => {
    const { page, state } = fakePage();
    const result = await executeAction(page, "misread", { selector: "SSO" });
    expect(result).toMatch(/^Misread rejected/);
    expect(state.clicked).toBe(false);
  });

  it("records a wrong click without touching the page", async () => {
    const { page, state } = fakePage({ innerText: "Cancel" });
    const result = await executeAction(page, "wrong_click", {
      selector: "Cancel",
      intended: "Place Order",
    });
    expect(result).toMatch(/^Wrong click recorded:/);
    expect(result).toMatch(/did not click/i);
    expect(state.clicked).toBe(false);
    expect(state.touched).toBe(false);
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

  it("wires persona techLiteracy onto the guard so low-tech runs refuse unlabeled controls", () => {
    expect(src).toMatch(/techLiteracy:\s*traits\.techLiteracy/);
    expect(src).toMatch(/needsVisibleLabel/);
    expect(src).toMatch(/unlabeledControlRefusal/);
  });

  it("exposes misread and wrong_click as first-class tools that do not click", () => {
    expect(src).toMatch(/misread:\s*tool\(/);
    expect(src).toMatch(/wrong_click:\s*tool\(/);
    expect(src).toMatch(/misreadRecordedMessage/);
    expect(src).toMatch(/wrongClickRecordedMessage/);
  });

  it("code-enforces jargon as a misread for low-tech personas", () => {
    expect(src).toMatch(/shouldMisreadJargon/);
    expect(src).toMatch(/jargonMisreadMessage/);
  });
});

describe("saved-task confirmation cannot be typed into existence", () => {
  const task = { version: 1 as const, goal: "Complete the synthetic request", successText: "Request received" };
  it.each(["Request received", "Request\n received", "Note: Request received"])("blocks manufactured confirmation before touching the page: %s", async (text) => {
    const { page, state } = fakePage();
    expect(await executeAction(page, "type", { selector: "Note", text }, { task })).toMatch(/Refused to type/);
    expect(state.touched).toBe(false);
  });
  it("allows ordinary task input", async () => {
    const { page, state } = fakePage({ innerText: "Note" });
    await executeAction(page, "type", { selector: "Note", text: "A synthetic question" }, { task });
    expect(state.filled).toBe(true);
  });
  it("does not restrict runs without a saved-task assertion", async () => {
    const { page, state } = fakePage({ innerText: "Note" });
    await executeAction(page, "type", { selector: "Note", text: "Request received" });
    expect(state.filled).toBe(true);
  });
});
