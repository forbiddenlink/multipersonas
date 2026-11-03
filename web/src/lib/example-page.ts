import { computeGrade, type GradeReport, type PageAxe } from "@engine/grader/score";
import { SAMPLE_VERDICTS } from "@/lib/sample-evidence";

/**
 * One small example page, written once and read four ways. The persona lineup draws its
 * normal view, its keyboard view and its text outline from this single list, so the four
 * views cannot disagree about what is on the page.
 *
 * It is an example, not a scan. What it takes from the real SauceDemo probe
 * (experiments/net-new-violations) is one state, the checkout validation error, and one
 * finding, `button-name` (WCAG 4.1.2): the error's dismiss control has no accessible name.
 * Everything else on the page is made up to make that state readable.
 */
export type ExampleNode = {
  id: string;
  role: "heading" | "textbox" | "alert" | "button" | "link";
  /** Accessible name. `null` means the element has none, which is the finding. */
  name: string | null;
  /** Visible text, when it differs from the name. */
  text?: string;
  level?: number;
  invalid?: boolean;
  /** Reachable with Tab, in this order. */
  tabbable: boolean;
};

export const EXAMPLE_PAGE: { host: string; path: string; nodes: readonly ExampleNode[] } = {
  host: "example.test",
  path: "/checkout (error)",
  nodes: [
    { id: "title", role: "heading", name: "Checkout: Your information", level: 1, tabbable: false },
    { id: "first", role: "textbox", name: "First name", tabbable: true },
    { id: "last", role: "textbox", name: "Last name", tabbable: true },
    { id: "postal", role: "textbox", name: "Postal code", invalid: true, tabbable: true },
    { id: "error", role: "alert", name: null, text: "Error: Postal code is required", tabbable: false },
    { id: "dismiss", role: "button", name: null, tabbable: true },
    { id: "cancel", role: "link", name: "Cancel", tabbable: true },
    { id: "continue", role: "button", name: "Continue", tabbable: true },
  ],
};

/** The element axe flags on this page. */
export const EXAMPLE_FAULT_ID = "dismiss";

/** Tab order: 1-based number for each tabbable node, in document order. */
export function tabOrder(): Map<string, number> {
  const order = new Map<string, number>();
  let n = 0;
  for (const node of EXAMPLE_PAGE.nodes) {
    if (node.tabbable) order.set(node.id, ++n);
  }
  return order;
}

/**
 * The page as text, in the shape of the Playwright aria snapshot the AI agent visitor
 * reads (`- role "name" [ref=eN]`). Refs go to interactive nodes only, as in the engine.
 */
export function outlineLines(): { text: string; fault: boolean }[] {
  let ref = 0;
  return EXAMPLE_PAGE.nodes.map((node) => {
    const parts = [`- ${node.role}`];
    if (node.name) parts.push(`"${node.name}"`);
    if (node.level) parts.push(`[level=${node.level}]`);
    if (node.invalid) parts.push("[invalid]");
    if (node.tabbable) parts.push(`[ref=e${++ref}]`);
    const text = node.role === "alert" && node.text ? `${parts.join(" ")}: ${node.text}` : parts.join(" ");
    return { text, fault: node.id === EXAMPLE_FAULT_ID };
  });
}

/**
 * The sample grade, from the engine's own scorer. One page, one critical WCAG A/AA failure
 * (the `button-name` finding from the probe). The passed-check count is an example value:
 * with it the score lands in the B band and the engine's critical-failure cap holds the
 * letter at C. The page shows the letter and the cap, never a score, because the score
 * depends on that example count.
 */
const EXAMPLE_PASSED_CHECKS = 40;

export function exampleGrade(): GradeReport {
  const fault = SAMPLE_VERDICTS[0];
  const page: PageAxe = {
    url: `https://${EXAMPLE_PAGE.host}${EXAMPLE_PAGE.path}`,
    violationsByImpact: { critical: 1, serious: 0, moderate: 0, minor: 0 },
    passCount: EXAMPLE_PASSED_CHECKS,
    wcagAAViolations: 1,
    rules: [{ id: fault.ruleId, impact: "critical", nodes: 1, help: fault.help, wcagAA: true }],
  };
  return computeGrade([page]);
}
