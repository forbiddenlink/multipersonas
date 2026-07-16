import { Persona, generateSystemPrompt } from "./types.js";

function buildPersona(partial: Omit<Persona, "systemPrompt">): Persona {
  return {
    ...partial,
    systemPrompt: generateSystemPrompt(partial),
  };
}

export const firstTimeVisitor: Persona = buildPersona({
  id: "first-time-visitor",
  name: "Sarah",
  description:
    "a 34-year-old marketing manager evaluating a product for her team",
  kind: "ux",
  goals: [
    "Understand what the product does within 60 seconds of landing",
    "Find pricing information and compare plans",
    "Determine if the product fits her team's needs without signing up",
  ],
  frustrations: [
    "Technical jargon and acronyms she doesn't understand",
    "Pricing hidden behind 'Contact Sales' or signup walls",
    "Too many clicks to find basic information",
    "Vague marketing copy that doesn't explain what the product actually does",
    "Auto-playing videos or aggressive popups",
  ],
  techProficiency: 2,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 20,
  patienceLevel: "medium",
});

/**
 * Keyboard reachability traversal.
 *
 * This replaced a persona called "James, a 42-year-old software engineer who is
 * blind", whose prompt asked the model to assign WCAG criteria and score
 * compliance 1-10. Both halves of that were wrong: LLM accessibility judgments
 * run ~71% precision (ScreenAudit, CHI 2025), and simulating a blind user is
 * inaccurate and harmful — a fake blind man is not a test, and the accessibility
 * community says so plainly (Boyer, "How to Dehumanize Accessibility with AI").
 *
 * What survived is the part that was always the real value: the procedure.
 * Walking landmarks, headings, tab order, forms and live regions is worth doing —
 * it just needs no fictional person to do it, and it must not pretend to judge.
 * axe-core renders the verdicts at each state this reaches.
 *
 * See docs/PLAN-2026-07-15-repositioning.md.
 */
export const keyboardTraversal: Persona = buildPersona({
  id: "keyboard-traversal",
  name: "Keyboard traversal",
  description:
    "an automated harness that drives the site using only the keyboard, so axe can scan the states it reaches",
  kind: "traversal",
  goals: [
    "Reach the main content region and enumerate the page's landmark and heading structure",
    "Complete a core task (signup, search, or the primary action) using only the keyboard",
    "Open and dismiss any dialog, menu, or expandable region, so each state gets scanned",
    "Submit a form with invalid input to reach its error state",
  ],
  frustrations: [
    "Controls that cannot be reached or operated with the keyboard",
    "Focus that becomes trapped and cannot move onward",
    "Focus that is lost or reset after an interaction",
    "Focus order that does not follow the visual or DOM order",
  ],
  techProficiency: 5,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "keyboard",
  maxSteps: 30,
  patienceLevel: "high",
});

export const mobileSlowConnection: Persona = buildPersona({
  id: "mobile-slow-connection",
  name: "Maria",
  description:
    "a 28-year-old college student browsing on her phone during a commute with spotty reception",
  kind: "ux",
  goals: [
    "Quickly find a specific piece of information (pricing, hours, a key feature)",
    "Complete a task on the go without pinching, zooming, or excessive scrolling",
    "Get what she needs in under 2 minutes before losing signal",
  ],
  frustrations: [
    "Tiny tap targets that are hard to hit accurately",
    "Pages that take forever to load on slow connections",
    "Too much content crammed onto mobile screens",
    "Popups, modals, and cookie banners that are hard to dismiss on mobile",
    "Horizontal scrolling or content that overflows the viewport",
    "Features that require hovering (impossible on touch)",
  ],
  techProficiency: 3,
  viewport: { width: 375, height: 812 },
  isMobile: true,
  connectionSpeed: "slow-3g",
  inputModality: "pointer",
  maxSteps: 15,
  patienceLevel: "low",
});

export const prebuiltPersonas: Record<string, Persona> = {
  "first-time-visitor": firstTimeVisitor,
  "keyboard-traversal": keyboardTraversal,
  "mobile-slow-connection": mobileSlowConnection,
};

/**
 * Retired ids -> what replaced them, so old configs and saved custom personas
 * fail with a useful message instead of "persona not found".
 */
export const RETIRED_PERSONA_IDS: Record<string, string> = {
  "screen-reader-user": "keyboard-traversal",
  "color-blind-user": "", // deleted: colour contrast is a deterministic axe rule
};
