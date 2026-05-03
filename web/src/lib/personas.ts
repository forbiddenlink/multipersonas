export const PERSONA_DATA = {
  "first-time-visitor": {
    id: "first-time-visitor",
    name: "Sarah",
    role: "First-Time Visitor",
    description: "Marketing manager evaluating the product",
  },
  "screen-reader-user": {
    id: "screen-reader-user",
    name: "James",
    role: "Screen Reader User",
    description: "Blind software engineer using assistive tech",
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
