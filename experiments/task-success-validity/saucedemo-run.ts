/**
 * Task-success validity, run 2 — SauceDemo (public e-commerce checkout).
 *
 *   npx tsx experiments/task-success-validity/saucedemo-session.ts   # capture session
 *   npx tsx experiments/task-success-validity/saucedemo-run.ts       # run
 */
import { SAUCEDEMO_GOALS } from "./saucedemo-goals.js";
import { runValidation } from "./harness.js";

runValidation({
  target: "https://www.saucedemo.com/inventory.html",
  sessionFile: ".saucedemo-session.json",
  goals: SAUCEDEMO_GOALS,
  outDir: "experiments/task-success-validity/results-saucedemo",
  allowPrivate: false, // public site — no private-network exception
  label: "standard_user session",
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
