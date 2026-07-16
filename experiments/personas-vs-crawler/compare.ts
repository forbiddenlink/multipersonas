import type { Finding } from "../../src/agent/engine.js";

/**
 * The pre-registered comparison. See README.md — the metric and the kill
 * criterion were committed before the crawler existed and must not move.
 */

/** A defect is a rule violated by a specific element. Not per page. */
export function defectKey(f: Finding): string {
  return `${f.ruleId ?? f.title}|${f.target ?? ""}`;
}

export function defectSet(findings: Finding[]): Set<string> {
  return new Set(findings.map(defectKey));
}

export interface Comparison {
  personasOnly: string[];
  crawlerOnly: string[];
  shared: string[];
  /** Primary outcome: |personasOnly| / |union|. */
  netNewPct: number;
  verdict: Verdict;
  personaStates: number;
  crawlerStates: number;
  /** States personas reached that the crawler never visited. */
  statesOnlyPersonas: string[];
}

export type Verdict = "KILL_DIFFERENTIATOR" | "WEAK_SUPPORT" | "STRONG_SUPPORT";

/** Thresholds fixed by the pre-registration. Changing these invalidates the run. */
export const KILL_BELOW_PCT = 15;
export const STRONG_ABOVE_PCT = 40;

export function verdictFor(netNewPct: number): Verdict {
  if (netNewPct < KILL_BELOW_PCT) return "KILL_DIFFERENTIATOR";
  if (netNewPct > STRONG_ABOVE_PCT) return "STRONG_SUPPORT";
  return "WEAK_SUPPORT";
}

export function compare(
  personaFindings: Finding[],
  crawlerFindings: Finding[],
  personaStates: string[],
  crawlerStates: string[],
): Comparison {
  const P = defectSet(personaFindings);
  const C = defectSet(crawlerFindings);

  const personasOnly = [...P].filter((k) => !C.has(k));
  const crawlerOnly = [...C].filter((k) => !P.has(k));
  const shared = [...P].filter((k) => C.has(k));

  const unionSize = new Set([...P, ...C]).size;
  // An empty union means neither arm found anything — 0%, not a divide by zero,
  // and it would mean the experiment failed rather than the personas did.
  const netNewPct = unionSize === 0 ? 0 : (personasOnly.length / unionSize) * 100;

  const crawlerSeen = new Set(crawlerStates.map(stripHash));
  const statesOnlyPersonas = [...new Set(personaStates.map(stripHash))].filter(
    (s) => !crawlerSeen.has(s),
  );

  return {
    personasOnly,
    crawlerOnly,
    shared,
    netNewPct,
    verdict: verdictFor(netNewPct),
    personaStates: new Set(personaStates.map(stripHash)).size,
    crawlerStates: crawlerSeen.size,
    statesOnlyPersonas,
  };
}

function stripHash(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}
