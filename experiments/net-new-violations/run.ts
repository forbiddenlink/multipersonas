import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { targets, type Target } from "./targets.js";
import { scan, analyse, verdict, primaryOutcome, type StateScan, type Analysis } from "./measure.js";

/**
 * Measures whether deep states hold accessibility violations that a page-level
 * scan misses. Zero LLM — plain Playwright + axe, deterministic and re-runnable.
 *
 * Read README.md before interpreting the output. The kill criterion is declared
 * in measure.ts and was set before the first run.
 *
 *   pnpm exec tsx experiments/net-new-violations/run.ts [targetId]
 */

const RESULTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "results");

async function measureTarget(browser: Browser, target: Target) {
  // Each state gets a fresh context so earlier states cannot leak session or
  // DOM state into later ones — that would make results order-dependent.
  const freshPage = async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (target.setup) await target.setup(page);
    return { context, page };
  };

  process.stdout.write(`\n${target.id}  ${target.url}\n`);

  const { context: baseCtx, page: basePage } = await freshPage();
  const baseline = await scan(basePage);
  await baseCtx.close();
  process.stdout.write(`  baseline: ${baseline.length} violation instances\n`);

  const states: StateScan[] = [];
  for (const spec of target.states) {
    const { context, page } = await freshPage();
    try {
      await spec.reach(page);
      const violations = await scan(page);
      states.push({ name: spec.name, whyCrawlerMisses: spec.whyCrawlerMisses, violations });
      process.stdout.write(`  ${spec.name}: ${violations.length} instances\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0]! : String(error);
      // Recorded, never dropped — a silently skipped state would inflate the result.
      states.push({
        name: spec.name,
        whyCrawlerMisses: spec.whyCrawlerMisses,
        violations: [],
        error: message,
      });
      process.stdout.write(`  ${spec.name}: FAILED (${message})\n`);
    } finally {
      await context.close();
    }
  }

  return { baseline, states, analysis: analyse(baseline, states) };
}

function report(targetId: string, a: Analysis): string {
  const v = verdict(a);
  const lines = [
    ``,
    `  ── ${targetId} ─────────────────────────────`,
    `  baseline (what a crawler sees): ${a.baselineCount} instances, ${a.baselineBlocking} blocking`,
    `  across all deep states:         ${a.deepCount} instances`,
    `  NET-NEW:                        ${a.netNew.length} instances, ${a.netNewBlocking.length} blocking`,
    `  net-new rule types:             ${a.netNewRuleIds.length ? a.netNewRuleIds.join(", ") : "none"}`,
    `  net-new blocking share:         ${a.netNewBlockingPct.toFixed(1)}%`,
    ``,
  ];
  for (const s of a.perState) {
    lines.push(
      s.error
        ? `    ${s.name.padEnd(28)} FAILED — ${s.error}`
        : `    ${s.name.padEnd(28)} +${s.netNew} net-new (${s.netNewBlocking} blocking)`,
    );
  }
  lines.push(``, `  PRIMARY (pre-registered): ${primaryOutcome(a).line}`);
  lines.push(`  run-1 metric (deprecated): ${v.line}`, ``);
  return lines.join("\n");
}

async function main() {
  const only = process.argv[2];
  const selected = only ? targets.filter((t) => t.id === only) : targets;
  if (selected.length === 0) {
    console.error(`No target "${only}". Known: ${targets.map((t) => t.id).join(", ")}`);
    process.exit(1);
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const summaries: { id: string; analysis: Analysis }[] = [];

  try {
    for (const target of selected) {
      const { baseline, states, analysis } = await measureTarget(browser, target);
      fs.writeFileSync(
        path.join(RESULTS_DIR, `${target.id}.json`),
        JSON.stringify({ target: target.id, url: target.url, baseline, states, analysis }, null, 2),
      );
      process.stdout.write(report(target.id, analysis));
      summaries.push({ id: target.id, analysis });
    }
  } finally {
    await browser.close();
  }

  process.stdout.write(`\n══ VERDICT ═══════════════════════════════\n`);
  for (const { id, analysis } of summaries) {
    const p = primaryOutcome(analysis);
    process.stdout.write(`  ${id.padEnd(18)} ${p.outcome.padEnd(26)} ${analysis.netNewBlockingCount} net-new blocking\n`);
  }
  const wrong = summaries.filter((s) => primaryOutcome(s.analysis).outcome === "CRAWLER_WRONG").length;
  const scored = summaries.filter((s) => primaryOutcome(s.analysis).outcome !== "INCONCLUSIVE").length;
  process.stdout.write(`\n  Crawler verdict WRONG on ${wrong}/${scored} sites scored.\n`);
  process.stdout.write(`\n  Results: ${RESULTS_DIR}\n`);
  process.stdout.write(`  Interpret against README.md — this measures reach, not coverage.\n\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
