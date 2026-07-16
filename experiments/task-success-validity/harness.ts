import * as fs from "fs";
import * as path from "path";
import { goalPersona, type LabeledGoal } from "./goals.js";
import { score, type Outcome } from "./score.js";
import { runPersonaAgent } from "../../src/agent/engine.js";

/**
 * The shared task-success validation loop, so every target is measured by
 * identical code. See README.md for the pre-registered metric and thresholds.
 */
export async function runValidation(opts: {
  target: string;
  sessionFile: string;
  goals: LabeledGoal[];
  outDir: string;
  allowPrivate: boolean;
  label: string;
}): Promise<void> {
  const { target, sessionFile, goals, outDir, allowPrivate, label } = opts;
  if (!fs.existsSync(sessionFile)) throw new Error(`No session at ${sessionFile}.`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Target: ${target}   (${label})\n`);

  const outcomes: Outcome[] = [];
  const detail: Array<Outcome & { goal: string; steps: number; summary: string }> = [];

  // Sequential: single-goal probes, and sequential keeps the log readable.
  for (const g of goals) {
    process.stdout.write(`[${g.label.padEnd(10)}] ${g.id} ... `);
    const result = await runPersonaAgent(target, goalPersona(g), path.join(outDir, g.id), {
      allowPrivate,
      sessionFile,
    });

    const verdict: Outcome["verdict"] = result.goalCompleted ? "achieved" : "blocked";
    outcomes.push({ id: g.id, label: g.label, verdict });

    const last = result.steps.at(-1);
    const summary = last?.action === "finish" ? last.detail : "(no explicit finish)";
    const correct = (g.label === "achievable") === (verdict === "achieved");
    detail.push({ id: g.id, label: g.label, verdict, goal: g.goal, steps: result.totalSteps, summary });
    console.log(`${verdict}  ${correct ? "OK" : "WRONG"}`);
  }

  const s = score(outcomes);
  const nImpossible = goals.filter((g) => g.label === "impossible").length;
  const nAchievable = goals.filter((g) => g.label === "achievable").length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`agreement:      ${s.correct}/${s.total} = ${s.agreement.toFixed(0)}%`);
  console.log(`falseAchieved:  ${s.falseAchievedIds.length}/${nImpossible} = ${s.falseAchieved.toFixed(0)}%  ${s.falseAchievedIds.length ? "[" + s.falseAchievedIds.join(", ") + "]" : ""}`);
  console.log(`falseBlocked:   ${s.falseBlockedIds.length}/${nAchievable} = ${s.falseBlocked.toFixed(0)}%  ${s.falseBlockedIds.length ? "[" + s.falseBlockedIds.join(", ") + "]" : ""}`);
  console.log(`\nPRIMARY   ${s.primaryVerdict}   (kill if falseAchieved > 20%)`);
  console.log(`SECONDARY trust reading: ${s.trustReading}   (agreement ${s.agreement.toFixed(0)}%)`);
  console.log("=".repeat(60));

  console.log("\nPer-goal:");
  for (const d of detail) {
    const correct = (d.label === "achievable") === (d.verdict === "achieved");
    console.log(`  ${correct ? " " : "!"} ${d.id.padEnd(22)} ${d.label.padEnd(10)} -> ${d.verdict.padEnd(8)} (${d.steps} steps)`);
  }

  fs.writeFileSync(path.join(outDir, "run.json"), JSON.stringify({ target, score: s, detail }, null, 2));
  console.log(`\nRaw: ${path.join(outDir, "run.json")}`);
}
