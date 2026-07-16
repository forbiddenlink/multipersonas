import { describe, it, expect } from "vitest";
import { trimToWindow, HISTORY_WINDOW } from "./engine.js";

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
