import {
  personaDisplayRegistry,
  type BuiltinPersonaId,
} from "@engine/personas/library";

const PERSONA_ROLES = {
  "first-time-visitor": "First-time visitor",
  "keyboard-traversal": "Reachability harness",
  "mobile-slow-connection": "Mobile / slow connection",
  "elderly-user": "Retired, low-tech",
  "non-native-english": "Non-native English",
  "power-user-developer": "Developer / power user",
  "impatient-executive": "Impatient executive",
  "budget-conscious-student": "Budget-conscious student",
  "anxious-first-timer": "Cautious first-time buyer",
  "keyboard-office-worker": "Keyboard-only, situational",
  "one-handed-mobile": "One-handed, situational",
  "gloved-outdoor-courier": "Gloved touchscreen, situational",
} satisfies Record<BuiltinPersonaId, string>;

export type PersonaId = BuiltinPersonaId;

type PersonaDisplayData = {
  [K in PersonaId]: (typeof personaDisplayRegistry)[K] & { role: string };
};

export const PERSONA_DATA = Object.fromEntries(
  Object.entries(personaDisplayRegistry).map(([id, persona]) => [
    id,
    {
      ...persona,
      role: PERSONA_ROLES[id as PersonaId],
    },
  ]),
) as PersonaDisplayData;

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
