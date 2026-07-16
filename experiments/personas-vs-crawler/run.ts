/**
 * Run 4. See README.md for the pre-registration — metric and kill criterion were
 * committed before this file existed.
 *
 *   npx tsx experiments/personas-vs-crawler/run.ts
 *
 * Requires the fixture from docs/TESTING.md and a session from
 * scripts/fixture-session.ts.
 */
import * as fs from "fs";
import * as path from "path";
import { crawl } from "./crawler.js";
import { compare } from "./compare.js";
import { runMultiPersonaTest } from "../../src/agent/orchestrator.js";
import { generatePersonasFromUrl } from "../../src/personas/generator.js";
import type { Finding } from "../../src/agent/engine.js";

const TARGET = process.env.MP_FIXTURE_URL ?? "http://localhost:3010";
const SESSION = ".mpersonas-session.json";
const CRAWLER_MAX_PAGES = 40; // Steel-manned: more budget than the personas get steps.
const PERSONA_COUNT = 3;
const OUT = path.join("experiments/personas-vs-crawler/results");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(SESSION)) {
    throw new Error(`No ${SESSION}. Run: npx tsx scripts/fixture-session.ts`);
  }

  console.log(`Target: ${TARGET}\n`);

  // --- Arm C ---
  console.log(`[C] Crawling (budget ${CRAWLER_MAX_PAGES} pages)...`);
  const crawler = await crawl(TARGET, SESSION, CRAWLER_MAX_PAGES);
  console.log(`[C] ${crawler.pagesVisited.length} pages, ${crawler.findings.length} findings`);
  if (crawler.skipped.length) {
    // Declared honestly: if the crawler ran out of budget, it was not given a
    // fair shot and the comparison is compromised in the personas' favour.
    console.log(`[C] WARNING: budget exhausted, ${crawler.skipped.length} URLs unvisited`);
  }

  // --- Arm P ---
  console.log(`\n[P] Generating ${PERSONA_COUNT} personas from the signed-in app...`);
  const personas = await generatePersonasFromUrl(TARGET, PERSONA_COUNT, {
    allowPrivate: true,
    sessionFile: SESSION,
  });
  console.log(`[P] ${personas.map((p) => p.id).join(", ")}`);
  console.log(`[P] Running...`);
  const result = await runMultiPersonaTest({
    url: TARGET,
    personas,
    outputDir: path.join(OUT, "personas-run"),
    allowPrivate: true,
    sessionFile: SESSION,
    parallel: true,
  });
  const personaFindings: Finding[] = result.axeFindings;
  const personaStates = result.personas.flatMap((p) => p.agentResult.pagesVisited);
  console.log(`[P] ${new Set(personaStates).size} states, ${personaFindings.length} findings`);

  // --- Compare ---
  const c = compare(personaFindings, crawler.findings, personaStates, crawler.pagesVisited);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`States   — personas: ${c.personaStates}   crawler: ${c.crawlerStates}`);
  console.log(`Defects  — personas: ${new Set(personaFindings.map((f) => `${f.ruleId}|${f.target}`)).size}   crawler: ${new Set(crawler.findings.map((f) => `${f.ruleId}|${f.target}`)).size}`);
  console.log(`  shared:       ${c.shared.length}`);
  console.log(`  personas only:${c.personasOnly.length}`);
  console.log(`  crawler only: ${c.crawlerOnly.length}`);
  console.log(`\nPRIMARY  netNewPct = ${c.netNewPct.toFixed(1)}%`);
  console.log(`VERDICT  ${c.verdict}`);
  console.log("=".repeat(60));

  if (c.statesOnlyPersonas.length) {
    console.log(`\nStates only the personas reached (${c.statesOnlyPersonas.length}):`);
    for (const s of c.statesOnlyPersonas.slice(0, 15)) console.log(`  ${s.replace(TARGET, "")}`);
  }
  if (c.personasOnly.length) {
    console.log(`\nDefects only the personas found (${c.personasOnly.length}):`);
    for (const k of c.personasOnly.slice(0, 15)) console.log(`  ${k}`);
  }
  if (c.crawlerOnly.length) {
    console.log(`\nDefects only the crawler found (${c.crawlerOnly.length}) — personas missed these:`);
    for (const k of c.crawlerOnly.slice(0, 15)) console.log(`  ${k}`);
  }

  fs.writeFileSync(
    path.join(OUT, "run4.json"),
    JSON.stringify(
      {
        target: TARGET,
        crawlerBudget: CRAWLER_MAX_PAGES,
        crawlerBudgetExhausted: crawler.skipped.length > 0,
        crawlerPages: crawler.pagesVisited,
        personaIds: personas.map((p) => p.id),
        personaStates: [...new Set(personaStates)],
        comparison: c,
      },
      null,
      2,
    ),
  );
  console.log(`\nRaw: ${path.join(OUT, "run4.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
