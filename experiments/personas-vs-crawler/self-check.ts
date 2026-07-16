/**
 * Defect-key self-check. Pre-registered as the run-4 → run-5 gate.
 *
 * Crawl ONE target TWICE and compare the two runs with the same defectKey the
 * experiment uses. A correct key makes two identical crawls agree: `onlyInA` and
 * `onlyInB` should be ~0. A large number means the key is still keying on
 * per-render noise, and any run using it is measuring churn, not defects.
 *
 * This should have existed before run 4. It did not, which is why run 4's number
 * carried a flaw nobody caught until the data was in.
 *
 *   npx tsx experiments/personas-vs-crawler/self-check.ts
 */
import * as fs from "fs";
import { crawl } from "./crawler.js";
import { defectSet } from "./compare.js";

const TARGET = process.env.MP_FIXTURE_URL ?? "http://localhost:3010";
const SESSION = ".mpersonas-session.json";
const PAGES = 20; // Smaller than the real run; this measures key stability, not coverage.

/** Above this, the key is not stable enough to trust a cross-run comparison. */
const MAX_ACCEPTABLE_DRIFT_PCT = 5;

async function main() {
  if (!fs.existsSync(SESSION)) throw new Error(`No ${SESSION}. Run: npx tsx scripts/fixture-session.ts`);

  console.log(`Self-check: two identical crawls of ${TARGET}\n`);

  console.log("Crawl A...");
  const a = await crawl(TARGET, SESSION, PAGES);
  console.log(`  ${a.pagesVisited.length} pages, ${a.findings.length} findings`);

  console.log("Crawl B...");
  const b = await crawl(TARGET, SESSION, PAGES);
  console.log(`  ${b.pagesVisited.length} pages, ${b.findings.length} findings`);

  const A = defectSet(a.findings);
  const B = defectSet(b.findings);
  const onlyA = [...A].filter((k) => !B.has(k));
  const onlyB = [...B].filter((k) => !A.has(k));
  const union = new Set([...A, ...B]).size;
  const driftPct = union === 0 ? 0 : ((onlyA.length + onlyB.length) / union) * 100;

  console.log(`\n${"=".repeat(56)}`);
  console.log(`distinct defects — A: ${A.size}  B: ${B.size}  union: ${union}`);
  console.log(`only in A: ${onlyA.length}   only in B: ${onlyB.length}`);
  console.log(`DRIFT: ${driftPct.toFixed(1)}%  (two identical crawls should be ~0)`);
  const ok = driftPct <= MAX_ACCEPTABLE_DRIFT_PCT;
  console.log(ok ? "PASS — key is stable enough to compare runs" : "FAIL — key still keys on per-render noise");
  console.log("=".repeat(56));

  if (!ok) {
    console.log("\nSample of drifting defects (add their generators to defect-key.ts):");
    for (const k of [...onlyA, ...onlyB].slice(0, 20)) console.log(`  ${k}`);
  }

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
