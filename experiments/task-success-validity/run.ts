/**
 * Task-success validity run. See README.md — labels, metric, and kill criteria
 * were pre-registered and committed before this file existed.
 *
 *   npx tsx experiments/task-success-validity/run.ts
 *
 * Requires the fixture (docs/TESTING.md) and a NON-ADMIN session
 * (scripts/fixture-session.ts, default user).
 */
import * as fs from "fs";
import * as path from "path";
import { GOALS, goalPersona } from "./goals.js";
import { score, type Outcome } from "./score.js";
import { runPersonaAgent } from "../../src/agent/engine.js";

const TARGET = process.env.MP_FIXTURE_URL ?? "http://localhost:3010";
const SESSION = ".mpersonas-session.json";
const OUT = "experiments/task-success-validity/results";

async function main() {
  if (!fs.existsSync(SESSION)) throw new Error(`No ${SESSION}. Run: npx tsx scripts/fixture-session.ts`);
  fs.mkdirSync(OUT, { recursive: true });

  console.log(`Target: ${TARGET}   (non-admin session)\n`);

  const outcomes: Outcome[] = [];
  const detail: Array<Outcome & { goal: string; steps: number; summary: string }> = [];

  // Sequential on purpose: ten single-goal probes, each cheap, and sequential
  // keeps the output readable as it goes.
  for (const g of GOALS) {
    process.stdout.write(`[${g.label.padEnd(10)}] ${g.id} ... `);
    const persona = goalPersona(g);
    const result = await runPersonaAgent(TARGET, persona, path.join(OUT, g.id), {
      allowPrivate: true,
      sessionFile: SESSION,
    });

    const verdict: Outcome["verdict"] = result.goalCompleted ? "achieved" : "blocked";
    const o: Outcome = { id: g.id, label: g.label, verdict };
    outcomes.push(o);

    const last = result.steps.at(-1);
    const summary = last?.action === "finish" ? last.detail : "(no explicit finish)";
    const correct = (g.label === "achievable") === (verdict === "achieved");
    detail.push({ ...o, goal: g.goal, steps: result.totalSteps, summary });
    console.log(`${verdict}  ${correct ? "OK" : "WRONG"}`);
  }

  const s = score(outcomes);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`agreement:      ${s.correct}/${s.total} = ${s.agreement.toFixed(0)}%`);
  console.log(`falseAchieved:  ${s.falseAchievedIds.length}/5 = ${s.falseAchieved.toFixed(0)}%  ${s.falseAchievedIds.length ? "[" + s.falseAchievedIds.join(", ") + "]" : ""}`);
  console.log(`falseBlocked:   ${s.falseBlockedIds.length}/5 = ${s.falseBlocked.toFixed(0)}%  ${s.falseBlockedIds.length ? "[" + s.falseBlockedIds.join(", ") + "]" : ""}`);
  console.log(`\nPRIMARY   ${s.primaryVerdict}   (kill if falseAchieved > 20%)`);
  console.log(`SECONDARY trust reading: ${s.trustReading}   (agreement ${s.agreement.toFixed(0)}%)`);
  console.log("=".repeat(60));

  console.log("\nPer-goal:");
  for (const d of detail) {
    const correct = (d.label === "achievable") === (d.verdict === "achieved");
    console.log(`  ${correct ? " " : "!"} ${d.id.padEnd(22)} ${d.label.padEnd(10)} -> ${d.verdict.padEnd(8)} (${d.steps} steps)`);
  }

  fs.writeFileSync(path.join(OUT, "run.json"), JSON.stringify({ target: TARGET, score: s, detail }, null, 2));
  console.log(`\nRaw: ${path.join(OUT, "run.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
