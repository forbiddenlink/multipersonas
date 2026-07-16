import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";

/**
 * Pure measurement logic, kept separate from the browser driving so it can be
 * unit-tested. The diff here decides whether the product's premise holds, so it
 * is the last place we want a quiet bug.
 */

export type Impact = "critical" | "serious" | "moderate" | "minor";

export interface Violation {
  ruleId: string;
  impact: Impact;
  target: string;
  help: string;
}

/** Identity of a violation instance: this rule, failing on this element. */
export function identity(v: Violation): string {
  return `${v.ruleId}|${v.target}`;
}

/** Critical + serious. The only tiers worth a kill decision. */
export function isBlocking(v: Violation): boolean {
  return v.impact === "critical" || v.impact === "serious";
}

export interface StateScan {
  name: string;
  whyCrawlerMisses: string;
  violations: Violation[];
  error?: string;
}

export interface Analysis {
  baselineCount: number;
  baselineBlocking: number;
  /** Distinct violation instances across all deep states. */
  deepCount: number;
  /** Deep instances whose identity is absent from the baseline. */
  netNew: Violation[];
  netNewBlocking: Violation[];
  /** Rules that never fire on the entry page at all — stronger evidence. */
  netNewRuleIds: string[];
  /**
   * netNewBlocking / all blocking found anywhere.
   *
   * DEPRECATED as a decision metric after run 1 (2026-07-15). It is dominated by
   * how broken the entry page already is: a clean entry page scores ~100%
   * trivially, a broken one scores low however much is hidden. Still reported
   * for continuity with run 1; do not gate on it.
   */
  netNewBlockingPct: number;

  /**
   * PRIMARY METRIC, pre-registered 2026-07-15 before run 2.
   *
   * Would a crawler-based monitor's verdict be WRONG? A monitor scans the entry
   * URL only. If that scan finds no blocking violations it reports the site
   * clean. `crawlerVerdictWrong` is true when the entry scan says clean AND deep
   * scanning finds at least one blocking violation — a false negative on the
   * whole site, which is what the pitch actually rests on.
   */
  crawlerSaysClean: boolean;
  crawlerVerdictWrong: boolean;

  /**
   * SECONDARY, pre-registered with the above: the absolute count. A true pitch
   * at single-digit scale is still a thin product, and a percentage hides that.
   */
  netNewBlockingCount: number;

  /** States that could not be reached. Recorded, never silently dropped. */
  failedStates: string[];
  perState: { name: string; netNew: number; netNewBlocking: number; error?: string }[];
}

/**
 * Run-1 threshold. Kept as declared — the goalposts do not move retroactively.
 * Superseded as a gate by the verdict-accuracy metric above; see README.
 */
export const KILL_THRESHOLD_PCT = 30;

/**
 * Compare deep-state scans against the baseline.
 *
 * A violation counts as net-new only if this exact rule+element pair never
 * appeared on the entry page. That deliberately excludes global chrome: a header
 * contrast failure recurring on every state is not a discovery, because the
 * baseline already reported it.
 */
export function analyse(baseline: Violation[], states: StateScan[]): Analysis {
  const baselineIds = new Set(baseline.map(identity));
  const baselineRules = new Set(baseline.map((v) => v.ruleId));

  const seen = new Set<string>();
  const netNew: Violation[] = [];
  const allBlocking = new Set<string>(baseline.filter(isBlocking).map(identity));
  const perState: Analysis["perState"] = [];
  const failedStates: string[] = [];

  for (const state of states) {
    if (state.error) {
      failedStates.push(state.name);
      perState.push({ name: state.name, netNew: 0, netNewBlocking: 0, error: state.error });
      continue;
    }

    let stateNetNew = 0;
    let stateNetNewBlocking = 0;

    for (const v of state.violations) {
      const id = identity(v);
      if (isBlocking(v)) allBlocking.add(id);
      if (baselineIds.has(id)) continue; // baseline already caught it
      if (seen.has(id)) continue; // already counted from an earlier state
      seen.add(id);
      netNew.push(v);
      stateNetNew++;
      if (isBlocking(v)) stateNetNewBlocking++;
    }

    perState.push({ name: state.name, netNew: stateNetNew, netNewBlocking: stateNetNewBlocking });
  }

  const netNewBlocking = netNew.filter(isBlocking);
  const netNewRuleIds = [...new Set(netNew.map((v) => v.ruleId))].filter(
    (r) => !baselineRules.has(r),
  );

  const deepIds = new Set<string>();
  for (const s of states) for (const v of s.violations) deepIds.add(identity(v));

  const baselineBlocking = new Set(baseline.filter(isBlocking).map(identity)).size;
  // What a monitor would conclude from the entry page alone.
  const crawlerSaysClean = baselineBlocking === 0;

  return {
    baselineCount: new Set(baseline.map(identity)).size,
    baselineBlocking,
    deepCount: deepIds.size,
    netNew,
    netNewBlocking,
    netNewRuleIds,
    netNewBlockingPct:
      allBlocking.size === 0 ? 0 : (netNewBlocking.length / allBlocking.size) * 100,
    crawlerSaysClean,
    crawlerVerdictWrong: crawlerSaysClean && netNewBlocking.length > 0,
    netNewBlockingCount: netNewBlocking.length,
    failedStates,
    perState,
  };
}

/** Run-1 verdict. Kept verbatim so run 1 stays reproducible. Not the gate any more. */
export function verdict(a: Analysis): { pass: boolean; line: string } {
  const pct = a.netNewBlockingPct.toFixed(1);
  if (a.failedStates.length > 0 && a.netNew.length === 0) {
    return {
      pass: false,
      line: `INCONCLUSIVE — every deep state failed to load (${a.failedStates.join(", ")}). Fix the harness before judging the thesis.`,
    };
  }
  return a.netNewBlockingPct >= KILL_THRESHOLD_PCT
    ? { pass: true, line: `PASS — ${pct}% of blocking violations are net-new (threshold ${KILL_THRESHOLD_PCT}%).` }
    : { pass: false, line: `KILL — only ${pct}% of blocking violations are net-new (threshold ${KILL_THRESHOLD_PCT}%). The thesis does not hold here.` };
}

export type PrimaryOutcome =
  | "CRAWLER_WRONG" // monitor reports clean; deep scanning finds blocking violations
  | "CRAWLER_RIGHT_BUT_SHALLOW" // monitor already says broken, deep adds more
  | "NOTHING_HIDDEN" // deep scanning found no blocking violations the monitor missed
  | "INCONCLUSIVE"; // harness failed; not evidence either way

/**
 * PRE-REGISTERED 2026-07-15, before run 2, before seeing any run-2 data.
 *
 * The pitch is "monitoring platforms crawl pages, so the flows behind ~70% of
 * ADA lawsuits are the ones your monitor never scans." The number that supports
 * that claim is not a percentage of violations — it is how often the monitor's
 * VERDICT is wrong. CRAWLER_WRONG is the only outcome that supports the pitch.
 */
export function primaryOutcome(a: Analysis): { outcome: PrimaryOutcome; line: string } {
  // A harness that could not reach anything proves nothing. Never let a broken
  // run read as evidence against (or for) the thesis.
  if (a.failedStates.length > 0 && a.netNew.length === 0) {
    return {
      outcome: "INCONCLUSIVE",
      line: `INCONCLUSIVE — deep states failed to load (${a.failedStates.join(", ")}). Harness problem, not a finding.`,
    };
  }
  if (a.crawlerVerdictWrong) {
    return {
      outcome: "CRAWLER_WRONG",
      line: `CRAWLER WRONG — entry scan reports CLEAN; deep states hold ${a.netNewBlockingCount} blocking violation(s). A monitor would give this site a green dashboard.`,
    };
  }
  if (a.netNewBlockingCount > 0) {
    return {
      outcome: "CRAWLER_RIGHT_BUT_SHALLOW",
      line: `CRAWLER RIGHT BUT SHALLOW — entry scan already flags ${a.baselineBlocking} blocking; deep states add ${a.netNewBlockingCount} more. The monitor's verdict stands; only its detail is thin.`,
    };
  }
  return {
    outcome: "NOTHING_HIDDEN",
    line: `NOTHING HIDDEN — deep states added no blocking violations the entry scan missed.`,
  };
}

/**
 * Identical axe config for baseline and every deep state. Differing tags between
 * the two would manufacture net-new findings out of nothing.
 */
export async function scan(page: Page): Promise<Violation[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const out: Violation[] = [];
  for (const v of results.violations) {
    for (const node of v.nodes) {
      out.push({
        ruleId: v.id,
        impact: (v.impact ?? "minor") as Impact,
        target: node.target.join(" > "),
        help: v.help,
      });
    }
  }
  return out;
}
