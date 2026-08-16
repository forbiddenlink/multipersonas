// Display metadata for the personas a run can use. The engine (`personaLibrary` in
// src/personas/library.ts) is the source of truth for which ids are actually runnable;
// the API validates against it. This map is presentation only (name + short role for
// the picker). Keys must stay in sync with personaLibrary ids.
export const PERSONA_DATA = {
  "first-time-visitor": {
    id: "first-time-visitor",
    name: "Sarah",
    role: "First-time visitor",
    description: "Marketing manager evaluating the product",
  },
  // Not a person — a keyboard-only reachability harness. It drives the site so axe can
  // scan states a page-level scan never reaches. It never claims a disability.
  "keyboard-traversal": {
    id: "keyboard-traversal",
    name: "Keyboard traversal",
    role: "Reachability harness",
    description: "Drives the site keyboard-only so axe can scan states a page scan never reaches",
  },
  "mobile-slow-connection": {
    id: "mobile-slow-connection",
    name: "Maria",
    role: "Mobile / slow connection",
    description: "Student browsing on a phone with spotty signal",
  },
  "elderly-user": {
    id: "elderly-user",
    name: "Margaret",
    role: "Retired, low-tech",
    description: "Retired librarian on desktop with large text; cautious with new UI patterns",
  },
  "non-native-english": {
    id: "non-native-english",
    name: "Yuki",
    role: "Non-native English",
    description: "Reads English well but trips on idioms and casual copy",
  },
  "power-user-developer": {
    id: "power-user-developer",
    name: "Alex",
    role: "Developer / power user",
    description: "Senior frontend dev hunting for docs, SDKs, and self-serve signup",
  },
  "impatient-executive": {
    id: "impatient-executive",
    name: "Rachel",
    role: "Impatient executive",
    description: "VP of Product on mobile who wants the value prop and pricing in 30 seconds",
  },
  "budget-conscious-student": {
    id: "budget-conscious-student",
    name: "Jamal",
    role: "Budget-conscious student",
    description: "CS student on slow mobile data comparing the free tier to alternatives",
  },
  "anxious-first-timer": {
    id: "anxious-first-timer",
    name: "Linda",
    role: "Cautious first-time buyer",
    description: "Small-business owner making a first SaaS purchase; wary of online payment",
  },
  "keyboard-office-worker": {
    id: "keyboard-office-worker",
    name: "Dennis",
    role: "Keyboard-only, situational",
    description: "Office admin whose mouse died mid-shift; finishing a form using only the keyboard",
  },
  "one-handed-mobile": {
    id: "one-handed-mobile",
    name: "Priya",
    role: "One-handed, situational",
    description: "Parent holding a toddler, reordering groceries one-handed on her phone",
  },
  "gloved-outdoor-courier": {
    id: "gloved-outdoor-courier",
    name: "Marcus",
    role: "Gloved touchscreen, situational",
    description: "Delivery courier confirming a drop-off on a tablet, wearing work gloves outdoors",
  },
} as const;

export type PersonaId = keyof typeof PERSONA_DATA;

/** Every selectable persona id. Order = display order in the picker. */
export const PERSONA_IDS = Object.keys(PERSONA_DATA) as PersonaId[];

/** The three that run when the user picks nothing — the honest core coverage. */
export const DEFAULT_PERSONA_IDS: PersonaId[] = [
  "first-time-visitor",
  "keyboard-traversal",
  "mobile-slow-connection",
];

/** Upper bound on personas per run. Each persona is a full agent loop (model cost +
 * wall-clock), so this is bounded until a durable spend cap lands (see docs/DEPLOYMENT.md). */
export const MAX_PERSONAS = 5;
