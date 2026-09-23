import type { Locator, Page } from "playwright";

// A bounded search, not proof that a control is unreachable by every keyboard path.
const MAX_TAB_PRESSES = 60;
const FOCUS_TIMEOUT_MS = 5_000;

async function hasFocus(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    const root = element.getRootNode() as Document | ShadowRoot;
    return root.activeElement === element;
  }, undefined, { timeout: 1_000 });
}

/** Never use locator.focus/press/fill: they can skip the actual tab order. */
export async function reachByKeyboard(page: Page, target: Locator): Promise<number | null> {
  const deadline = Date.now() + FOCUS_TIMEOUT_MS;
  for (let presses = 0; presses <= MAX_TAB_PRESSES && Date.now() < deadline; presses++) {
    if (await hasFocus(target)) return presses;
    if (presses < MAX_TAB_PRESSES) await page.keyboard.press("Tab");
  }
  return null;
}

export function keyboardReachFailure(selector: string): string {
  return `"${selector}" was not reached within ${MAX_TAB_PRESSES} Tab presses or ${FOCUS_TIMEOUT_MS}ms. No activation or input was attempted. This bounded search does not establish that every keyboard path is blocked.`;
}

export async function activateByKeyboard(page: Page, target: Locator): Promise<string> {
  const key = await target.evaluate((element) => {
    const role = element.getAttribute("role");
    const type = element.getAttribute("type");
    return (element.tagName === "INPUT" && (type === "checkbox" || type === "radio")) ||
      role === "checkbox" || role === "radio" || role === "switch" ? "Space" : "Enter";
  });
  if (!(await hasFocus(target))) throw new Error("Keyboard focus moved before activation; no key was sent.");
  await page.keyboard.press(key);
  return key;
}

export async function typeByKeyboard(page: Page, target: Locator, text: string): Promise<void> {
  if (!(await target.isEditable()) || !(await hasFocus(target))) {
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
  if (!available || option.length > 200 || !(await hasFocus(target))) return false;
  // Native select type-ahead works without programmatically changing its value
  // or relying on platform-specific popup-menu handling in headless Chromium.
  await page.keyboard.type(option);
  if (await hasFocus(target)) await page.keyboard.press("Tab");
  return target.evaluate((element, label) => {
    const select = element as HTMLSelectElement;
    return select.selectedOptions.length === 1 && select.selectedOptions[0]?.label === label;
  }, option);
}
