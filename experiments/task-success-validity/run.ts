/**
 * Task-success validity, run 1 — Metabase fixture.
 *
 *   npx tsx experiments/task-success-validity/run.ts
 *
 * Requires the fixture (docs/TESTING.md) and a NON-ADMIN session
 * (scripts/fixture-session.ts, default user).
 */
import { GOALS } from "./goals.js";
import { runValidation } from "./harness.js";

runValidation({
  target: process.env.MP_FIXTURE_URL ?? "http://localhost:3010",
  sessionFile: ".mpersonas-session.json",
  goals: GOALS,
  outDir: "experiments/task-success-validity/results",
  allowPrivate: true,
  label: "non-admin session",
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
