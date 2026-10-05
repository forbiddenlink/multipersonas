// @vitest-environment node
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RULE_FIXES } from "@/components/dossier/grade-remediation";

interface AxeRuleMeta {
  ruleId: string;
  tags: string[];
}
interface AxeLike {
  getRules(): AxeRuleMeta[];
}

// axe-core is a transitive dependency of @axe-core/playwright (root workspace), so
// resolve it from there rather than from web/.
const rootRequire = createRequire(path.resolve(__dirname, "../../../../package.json"));
const axe = createRequire(rootRequire.resolve("@axe-core/playwright"))("axe-core") as AxeLike;

const WCAG_LEVEL_TAG = /^wcag2\d*a{1,2}$/;
const WCAG_SC_TAG = /^wcag(\d)(\d)(\d+)$/;

const wcagRules = axe.getRules().filter((r) => r.tags.some((t) => WCAG_LEVEL_TAG.test(t)));

function criteriaFromTags(tags: string[]): string[] {
  return tags
    .map((t) => WCAG_SC_TAG.exec(t))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`)
    .sort();
}

describe("RULE_FIXES coverage", () => {
  it("has an entry for every WCAG A/AA axe rule", () => {
    expect(wcagRules.length).toBeGreaterThan(0);
    const missing = wcagRules.map((r) => r.ruleId).filter((id) => !(id in RULE_FIXES));
    expect(missing).toEqual([]);
  });

  it("matches the success criteria in axe's own tags for every rule it covers", () => {
    const byId = new Map(axe.getRules().map((r) => [r.ruleId, r]));
    const mismatches: string[] = [];
    for (const [id, fix] of Object.entries(RULE_FIXES)) {
      const rule = byId.get(id);
      if (!rule) continue;
      const expected = criteriaFromTags(rule.tags);
      const actual = [...fix.wcag].sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        mismatches.push(`${id}: axe=${expected.join(",")} table=${actual.join(",")}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("keeps copy free of em dashes and conformance claims", () => {
    for (const [id, fix] of Object.entries(RULE_FIXES)) {
      const text = `${fix.title} ${fix.why} ${fix.fix}`;
      expect(text, id).not.toMatch(/—/);
      expect(text, id).not.toMatch(/complian|certif/i);
    }
  });
});
