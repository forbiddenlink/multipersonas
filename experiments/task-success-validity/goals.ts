import type { Persona } from "../../src/personas/types.js";
import { generateSystemPrompt } from "../../src/personas/types.js";

/**
 * The labeled goals. THIS IS PRE-REGISTRATION CONTENT — the ground-truth labels
 * were committed before the harness ran. See README.md. Do not edit a label
 * after data exists.
 */

export type Label = "achievable" | "impossible";

export interface LabeledGoal {
  id: string;
  goal: string;
  label: Label;
  /** Why the label is true, so a reviewer can check it independently. */
  rationale: string;
}

export const GOALS: LabeledGoal[] = [
  {
    id: "view-orders-table",
    goal: "Open the sample database and view the Orders table.",
    label: "achievable",
    rationale: "The non-admin user can browse databases; /table for Orders is reachable.",
  },
  {
    id: "view-dashboard",
    goal: "Open and view an existing dashboard.",
    label: "achievable",
    rationale: "Example dashboards (E-commerce Insights, KPI Tracking) are visible to the user.",
  },
  {
    id: "view-account-profile",
    goal: "Open your own account profile settings.",
    label: "achievable",
    rationale: "/account/profile is reachable by any signed-in user.",
  },
  {
    id: "browse-databases",
    goal: "Browse the list of connected databases.",
    label: "achievable",
    rationale: "/browse/databases lists the sample database for all users.",
  },
  {
    id: "view-collection",
    goal: "Open a saved collection and view what is inside it.",
    label: "achievable",
    rationale: "The Examples collection is visible to the non-admin user.",
  },
  {
    id: "change-db-settings",
    goal: "Change the sample database's connection settings.",
    label: "impossible",
    rationale: "Database settings are admin-only; the non-admin user is sent to /unauthorized.",
  },
  {
    id: "add-user",
    goal: "Add a new user account to the system.",
    label: "impossible",
    rationale: "User administration is admin-only.",
  },
  {
    id: "find-pricing",
    goal: "Find and view the product's pricing plans.",
    label: "impossible",
    rationale: "Self-hosted Metabase has no in-app pricing page; it does not exist to be found.",
  },
  {
    id: "open-admin",
    goal: "Open the Admin settings panel.",
    label: "impossible",
    rationale: "The Admin panel is not accessible to a non-admin user.",
  },
  {
    id: "delete-user",
    goal: "Delete another user from the system.",
    label: "impossible",
    rationale: "User deletion is admin-only.",
  },
];

/**
 * A minimal single-goal UX persona, so its one verdict maps to one label.
 *
 * Kept deliberately generic (a competent desktop user) — this measures whether
 * the *verdict mechanism* is honest, not whether a particular persona flavour
 * is clever. techProficiency 4 and high patience remove "the persona gave up
 * early" as a confound on the achievable goals.
 */
export function goalPersona(g: LabeledGoal): Persona {
  const base: Omit<Persona, "systemPrompt"> = {
    id: `probe-${g.id}`,
    name: `Probe (${g.id})`,
    description: "a competent desktop user with one specific task",
    kind: "ux",
    goals: [g.goal],
    frustrations: [],
    techProficiency: 4,
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    connectionSpeed: "fast",
    inputModality: "pointer",
    maxSteps: 20,
    patienceLevel: "high",
  };
  return { ...base, systemPrompt: generateSystemPrompt(base) };
}
