// Shared E2E constants. Kept separate from seed.ts so importing the credentials does
// not trigger the seed script's top-level run.

/** The account the E2E suite signs in as. Local-only, never a real secret. */
export const TEST_USER = {
  email: "e2e@personaudit.test",
  password: "e2e-Test-Passw0rd!",
};

/** Where global-setup persists the authenticated cookie state for specs to reuse. */
export const STORAGE_STATE = "tests/e2e/.auth/state.json";
