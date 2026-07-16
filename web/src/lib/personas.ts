export const PERSONA_DATA = {
  "first-time-visitor": {
    id: "first-time-visitor",
    name: "Sarah",
    role: "First-Time Visitor",
    description: "Marketing manager evaluating the product",
  },
  // Replaced "James — Blind software engineer using assistive tech". We do not
  // simulate disabled users: it is inaccurate and harmful, and accessibility
  // verdicts come from axe-core, not a model in costume.
  // See docs/PLAN-2026-07-15-repositioning.md.
  "keyboard-traversal": {
    id: "keyboard-traversal",
    name: "Keyboard traversal",
    role: "Reachability",
    description: "Drives the site keyboard-only so axe can scan states a page scan never reaches",
  },
  "mobile-slow-connection": {
    id: "mobile-slow-connection",
    name: "Maria",
    role: "Mobile / Slow Connection",
    description: "Student browsing on phone with spotty signal",
  },
} as const;

export type PersonaId = keyof typeof PERSONA_DATA;

export const PERSONA_IDS = Object.keys(PERSONA_DATA) as PersonaId[];
