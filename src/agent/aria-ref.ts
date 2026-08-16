/**
 * Playwright aria-snapshot refs (`e12`, optionally frame-prefixed `f1e3`).
 *
 * Snapshots taken with `ariaSnapshot({ mode: "ai" })` stamp interactable nodes
 * with `[ref=eN]`. Those refs are turn-scoped: re-snapshot after every action
 * and never cache them across navigations.
 */

/** Bare ref as it appears in the YAML (`e12`) or with a frame prefix (`f1e3`). */
const BARE_REF = /^(?:f\d+)?e\d+$/i;

/**
 * Pull a Playwright aria-ref id out of whatever the model passed as a selector.
 * Accepts `e12`, `aria-ref=e12`, and `[ref=e12]`. Returns null for accessible
 * names so those still go through getByRole / getByLabel.
 */
export function parseAriaRef(selector: string): string | null {
  const trimmed = selector.trim();
  if (!trimmed) return null;
  if (BARE_REF.test(trimmed)) return trimmed.toLowerCase();

  const embedded = /(?:aria-ref=|\[ref=)((?:f\d+)?e\d+)/i.exec(trimmed);
  if (embedded?.[1]) return embedded[1].toLowerCase();

  return null;
}

/** Locator string Playwright resolves against the last AI-mode snapshot. */
export function ariaRefLocator(ref: string): string {
  return `aria-ref=${ref}`;
}
