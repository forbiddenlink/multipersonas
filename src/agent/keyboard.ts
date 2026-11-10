import type { Locator, Page } from "playwright";

// Bounds on one search. The press budget is the real limit; the time budget only
// stops a page that hangs. 2026-11-09: the old 5s / 60-press pair timed out on
// slow remote pages after ~20 presses and still reported "60 Tab presses", so a
// skip link that takes focus on the first Tab was filed as unreachable.
const MAX_TAB_PRESSES = 150;
const SEARCH_TIMEOUT_MS = 20_000;
// Presses in a row that leave focus on the same element before we call it stuck.
const STUCK_AFTER = 3;

export type KeyboardReach =
  /** Focus landed on the target after `presses` Tab presses. */
  | { kind: "reached"; presses: number }
  /** Tab cycled through every stop and came back to where it started. */
  | { kind: "not-in-tab-order"; presses: number }
  /** Tab stopped moving focus: the same element stayed focused press after press. */
  | { kind: "focus-stuck"; presses: number }
  /** The press or time budget ran out before the tab order cycled. Proves nothing. */
  | { kind: "inconclusive"; presses: number; stoppedBy: "presses" | "time" };

interface FocusProbe {
  onTarget: boolean;
  /** Stable description of the deepest focused element, "" when nothing is focused. */
  focused: string;
}

/**
 * One round trip per press: is the target focused, and what is focused instead.
 * Halving the evaluate calls is what keeps 150 presses inside the time budget.
 */
async function probe(target: Locator): Promise<FocusProbe> {
  return target.evaluate((element) => {
    const root = element.getRootNode() as Document | ShadowRoot;
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const describe = (node: Element | null): string => {
      if (!node || node === document.body || node === document.documentElement) return "";
      const parts: string[] = [];
      let current: Element | null = node;
      while (current && current !== document.documentElement) {
        const parent: Element | null = current.parentElement;
        const index = parent ? Array.prototype.indexOf.call(parent.children, current) : 0;
        parts.unshift(`${current.tagName}:${index}`);
        current = parent ?? ((current.getRootNode() as ShadowRoot).host ?? null);
      }
      return parts.join("/");
    };
    return { onTarget: root.activeElement === element, focused: describe(active) };
  }, undefined, { timeout: 1_000 });
}

/**
 * Walk the real Tab order from wherever focus is now until the target is focused.
 * Never uses locator.focus/press/fill: they can skip the actual tab order.
 *
 * "not-in-tab-order" is only returned after focus comes back to the element it
 * started on, i.e. a full lap of the page's tab sequence. Running out of budget
 * is reported as inconclusive, never as unreachable.
 */
export async function reachByKeyboard(page: Page, target: Locator): Promise<KeyboardReach> {
  const deadline = Date.now() + SEARCH_TIMEOUT_MS;
  const first = await probe(target);
  if (first.onTarget) return { kind: "reached", presses: 0 };

  // Starting on the body (fresh page) has no element to come back to; the first
  // real stop becomes the lap marker instead.
  let lapStart = first.focused;
  let leftStart = false;
  let previous = first.focused;
  let unchanged = 0;

  for (let presses = 1; presses <= MAX_TAB_PRESSES; presses++) {
    if (Date.now() >= deadline) return { kind: "inconclusive", presses: presses - 1, stoppedBy: "time" };
    await page.keyboard.press("Tab");
    const now = await probe(target);
    if (now.onTarget) return { kind: "reached", presses };
    unchanged = now.focused !== "" && now.focused === previous ? unchanged + 1 : 0;
    previous = now.focused;
    if (unchanged >= STUCK_AFTER) return { kind: "focus-stuck", presses };
    if (now.focused === "") {
      // Between the last stop and the wrap: not a stop, but it does mean focus left the marker.
      if (lapStart !== "") leftStart = true;
      continue;
    }
    if (lapStart === "") {
      lapStart = now.focused;
      continue;
    }
    if (now.focused !== lapStart) {
      leftStart = true;
    } else if (leftStart) {
      return { kind: "not-in-tab-order", presses };
    }
  }
  return { kind: "inconclusive", presses: MAX_TAB_PRESSES, stoppedBy: "presses" };
}

export function keyboardReachFailure(selector: string, reach: Exclude<KeyboardReach, { kind: "reached" }>): string {
  if (reach.kind === "focus-stuck") {
    return `"${selector}" was not reached: focus stopped moving. ${STUCK_AFTER} Tab presses in a row left focus on the same element, so the Tab order does not continue past it. No activation or input was attempted.`;
  }
  if (reach.kind === "not-in-tab-order") {
    return `"${selector}" is not in the sequential Tab order from here: ${reach.presses} Tab presses went through every focus stop and returned to the starting element without focusing it. No activation or input was attempted.`;
  }
  const limit = reach.stoppedBy === "time" ? `${SEARCH_TIMEOUT_MS / 1000}s time limit` : `${MAX_TAB_PRESSES}-press limit`;
  return `"${selector}" was not focused after ${reach.presses} Tab presses; the search hit its ${limit} before the Tab order completed a full lap. This is inconclusive: it does NOT show the control is unreachable, so do not report it as a finding. No activation or input was attempted.`;
}

export async function activateByKeyboard(page: Page, target: Locator): Promise<string> {
  const key = await target.evaluate((element) => {
    const role = element.getAttribute("role");
    const type = element.getAttribute("type");
    return (element.tagName === "INPUT" && (type === "checkbox" || type === "radio")) ||
      role === "checkbox" || role === "radio" || role === "switch" ? "Space" : "Enter";
  });
  if (!(await probe(target)).onTarget) throw new Error("Keyboard focus moved before activation; no key was sent.");
  await page.keyboard.press(key);
  return key;
}

export async function typeByKeyboard(page: Page, target: Locator, text: string): Promise<void> {
  if (!(await target.isEditable()) || !(await probe(target)).onTarget) {
    throw new Error("The keyboard target is not focused and editable; no text was entered.");
  }
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
}

export async function selectByKeyboard(page: Page, target: Locator, option: string): Promise<boolean> {
  const available = await target.evaluate((element, label) => {
    if (!(element instanceof HTMLSelectElement) || element.multiple || element.disabled) return false;
    const options = Array.from(element.options).filter((item) => !item.disabled &&
      !(item.parentElement instanceof HTMLOptGroupElement && item.parentElement.disabled));
    return options.some((item) => item.label === label);
  }, option);
  if (!available || option.length > 200 || !(await probe(target)).onTarget) return false;
  // Native select type-ahead works without programmatically changing its value
  // or relying on platform-specific popup-menu handling in headless Chromium.
  await page.keyboard.type(option);
  if ((await probe(target)).onTarget) await page.keyboard.press("Tab");
  return target.evaluate((element, label) => {
    const select = element as HTMLSelectElement;
    return select.selectedOptions.length === 1 && select.selectedOptions[0]?.label === label;
  }, option);
}
