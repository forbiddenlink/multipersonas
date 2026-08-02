/**
 * Irreversible-action guard for persona `run` sessions.
 *
 * The threat is the mirror of the URL guard's: there we stop the agent going
 * somewhere it should not; here we stop it *doing* something it cannot undo. A
 * persona is handed a goal ("complete checkout", "cancel my plan") and a real
 * browser, and it will click the button that finishes the job. Pointed at a
 * throwaway/staging target that is fine — pointed at a live store or a real
 * account it places an actual order or deletes real data.
 *
 * Deliberately OFF by default. The product's one measured-valuable output is
 * task success (experiments/task-success-validity), and on a purchase goal the
 * completed purchase *is* the success signal — so a blanket block would break
 * the validated feature. Operators who point the tool at a real site opt in
 * (GuardOptions.blockDestructiveActions); everyone else's runs stay
 * byte-identical. Same default-safe/opt-out shape as `--allow-private` in the
 * URL guard.
 *
 * When enabled, reaching a blocked action is not a failure: it means the
 * persona walked the whole flow up to the point of no return. That is the flow
 * completed, minus the irreversible side effect — the guard preserves the
 * task-success reading rather than defeating it.
 *
 * Matching is on the element's accessible name (the string the model passes as
 * the click selector — see agentTools.click), lower-cased and space-normalized.
 * This is a deterministic denylist, not a model judgment, on purpose: the whole
 * codebase prefers a code-enforced boundary over trusting the LLM to behave.
 */

/**
 * Phrases that finish an irreversible action. Kept narrow on purpose: only the
 * point-of-no-return controls, never the reversible steps that lead up to them.
 *
 * Explicitly NOT here: "add to cart", "checkout" / "proceed to checkout" (a
 * page transition, still reversible), "continue", "next", "save" — blocking
 * those would stop the persona ever reaching the real decision point and turn
 * the guard into noise.
 */
export const DESTRUCTIVE_ACTION_PHRASES: readonly string[] = [
  // Payment / order completion
  "place order",
  "place your order",
  "buy now",
  "pay now",
  "confirm payment",
  "confirm and pay",
  "complete purchase",
  "complete order",
  "submit order",
  "submit payment",
  "confirm order",
  "confirm purchase",
  "purchase now",
  // Subscription / billing changes
  "start subscription",
  "subscribe now",
  "cancel subscription",
  "cancel plan",
  "cancel my plan",
  // Destructive account / data operations
  "delete account",
  "close account",
  "delete my account",
  "deactivate account",
  "delete permanently",
  "permanently delete",
];

/** Normalize an accessible name for matching: lowercased, collapsed whitespace. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * True if `accessibleName` names an action we must not execute in a test.
 *
 * Substring match on the normalized name so "Place Order" and "Place your
 * order now" both trip, while staying anchored to the specific phrases above
 * rather than loose verbs like "delete" alone (which would catch "delete this
 * filter" and other harmless controls).
 */
export function isDestructiveAction(accessibleName: string): boolean {
  const name = normalize(accessibleName);
  if (!name) return false;
  return DESTRUCTIVE_ACTION_PHRASES.some((phrase) => name.includes(phrase));
}

/**
 * The tool-result string handed back to the model when a destructive click is
 * refused. Phrased so the persona treats reaching this point as the flow being
 * complete and finishes honestly, rather than hunting for another way to press
 * the same button. Never explains the denylist — that would just teach it to
 * rephrase around the guard.
 */
export function destructiveActionRefusal(accessibleName: string): string {
  return (
    `The control "${accessibleName}" performs an irreversible action (a real ` +
    `purchase, payment, or deletion) and is not executed during a test. You have ` +
    `reached the final step of this flow — that counts as completing it. Do not ` +
    `look for another way to trigger it; finish and report the goal as achieved.`
  );
}
