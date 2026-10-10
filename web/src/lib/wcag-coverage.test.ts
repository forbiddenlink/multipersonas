// @vitest-environment node
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WCAG22_AA_CATALOG } from "./wcag-catalog";
import {
  AXE_RULES_BY_CRITERION,
  AXE_TESTED_CODES,
  AXE_UNRUN_RULES_BY_CRITERION,
  WCAG22_TAGGED_RULES,
  WCAG_COVERAGE,
  coverageKind,
  testedCodes,
} from "./wcag-coverage";
import { AXE_TESTABLE_CODES, wcagTagsToCriteria } from "./wcag";

interface AxeRuleMeta {
  ruleId: string;
  tags: string[];
}

// axe-core is a transitive dependency of @axe-core/playwright (root workspace).
const rootRequire = createRequire(path.resolve(__dirname, "../../../package.json"));
const axe = createRequire(rootRequire.resolve("@axe-core/playwright"))("axe-core") as {
  getRules(): AxeRuleMeta[];
};

const WCAG_LEVEL_TAG = /^wcag2\d*a{1,2}$/;
const WCAG_SC_TAG = /^wcag(\d)(\d)(\d+)$/;
const catalogCodes = new Set(WCAG22_AA_CATALOG.map((c) => c.code));

/** Mirrors the tag filter in src/agent/axe-scan.ts: experimental and deprecated rules do not run. */
function derive(runs: boolean): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const rule of axe.getRules()) {
    if (!rule.tags.some((t) => WCAG_LEVEL_TAG.test(t))) continue;
    const runsInScans = !rule.tags.includes("experimental") && !rule.tags.includes("deprecated");
    if (runsInScans !== runs) continue;
    for (const tag of rule.tags) {
      const m = WCAG_SC_TAG.exec(tag);
      const code = m ? `${m[1]}.${m[2]}.${m[3]}` : null;
      if (code && catalogCodes.has(code)) (out[code] ??= []).push(rule.ruleId);
    }
  }
  for (const rules of Object.values(out)) rules.sort();
  return out;
}

const sorted = (r: Readonly<Record<string, readonly string[]>>) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort()]));

describe("WCAG_COVERAGE", () => {
  it("lists every catalog criterion exactly once", () => {
    expect(WCAG_COVERAGE).toHaveLength(55);
    const codes = WCAG_COVERAGE.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(WCAG22_AA_CATALOG.map((c) => c.code));
  });

  it("puts each criterion in exactly one kind", () => {
    for (const c of WCAG_COVERAGE) {
      const memberships = [
        c.code in AXE_RULES_BY_CRITERION,
        c.code in AXE_UNRUN_RULES_BY_CRITERION,
      ].filter(Boolean).length;
      expect(memberships, c.code).toBeLessThanOrEqual(1);
      expect(c.kind === "manual", c.code).toBe(memberships === 0);
      expect(c.rules.length > 0, c.code).toBe(c.kind !== "manual");
    }
  });

  it("only names criteria that are in the WCAG 2.2 A/AA catalog", () => {
    for (const code of [...Object.keys(AXE_RULES_BY_CRITERION), ...Object.keys(AXE_UNRUN_RULES_BY_CRITERION)]) {
      expect(catalogCodes.has(code), code).toBe(true);
    }
  });

  it("matches the rules the installed axe-core runs, per criterion", () => {
    expect(sorted(AXE_RULES_BY_CRITERION)).toEqual(derive(true));
  });

  it("matches the rules the installed axe-core does not run, for criteria with no running rule", () => {
    const unrun = derive(false);
    const onlyUnrun = Object.fromEntries(Object.entries(unrun).filter(([code]) => !(code in AXE_RULES_BY_CRITERION)));
    expect(sorted(AXE_UNRUN_RULES_BY_CRITERION)).toEqual(onlyUnrun);
  });

  it("feeds the conformance engine the same set, so no criterion is called tested without a rule", () => {
    expect([...AXE_TESTABLE_CODES].sort()).toEqual([...AXE_TESTED_CODES].sort());
    expect(AXE_TESTED_CODES.has("2.3.1")).toBe(false); // flashes: no axe rule
    expect(AXE_TESTED_CODES.has("1.4.3")).toBe(true);
  });

  it("lets a violation of any axe-tested criterion be attributed to it", () => {
    for (const code of AXE_TESTED_CODES) {
      const tag = `wcag${code.replaceAll(".", "")}`;
      expect(wcagTagsToCriteria([tag]).map((c) => c.code), code).toEqual([code]);
    }
  });

  it("lists exactly the rules that need a WCAG 2.2 level tag to run", () => {
    const only22 = axe
      .getRules()
      .filter((r) => {
        const levels = r.tags.filter((t) => WCAG_LEVEL_TAG.test(t));
        return levels.length > 0 && levels.every((t) => /^wcag22/.test(t));
      })
      .map((r) => r.ruleId)
      .filter((id) => Object.values(AXE_RULES_BY_CRITERION).some((rules) => rules.includes(id)))
      .sort();
    expect([...WCAG22_TAGGED_RULES].sort()).toEqual(only22);
  });

  it("calls a criterion not evaluated when its only rule needs a tag the scan left out", () => {
    const probe = { wcag22Rules: false };
    expect(coverageKind("2.5.8")).toBe("axe");
    expect(coverageKind("2.5.8", probe)).toBe("not-evaluated");
    expect(testedCodes(probe).has("2.5.8")).toBe(false);
    expect(testedCodes(probe).size).toBe(AXE_TESTED_CODES.size - 1);
  });
});
