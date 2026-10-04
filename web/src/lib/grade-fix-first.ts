import { IMPACT_WEIGHT, type GradeRuleHit, type Impact } from "@engine/grader/score";
import { ruleFix } from "@/components/dossier/grade-remediation";

/** How many items the "Fix these first" list shows. */
export const FIX_FIRST_LIMIT = 3;

export interface FixFirstItem {
  ruleId: string;
  /** Plain-language name for the problem; axe's help text when the rule has no entry yet. */
  title: string;
  impact: Impact;
  /** `exact` is false on reports stored before page counts: the count is a lower bound. */
  pages: { count: number; exact: boolean };
  nodes: number;
  /** A selector that repeats across pages: one fix clears them all. */
  shared?: { target: string; pages: number };
  /** Who this blocks, inferred from the rule. Never a simulation. */
  why: string;
  fix?: string;
}

function pagesOf(rule: GradeRuleHit): { count: number; exact: boolean } {
  if (typeof rule.pages === "number") return { count: Math.max(1, rule.pages), exact: true };
  const fromExamples = new Set((rule.examples ?? []).map((e) => e.url)).size;
  return { count: Math.max(1, fromExamples), exact: false };
}

/**
 * Priority of a rule: severity weight x pages affected x (1 + log2 nodes).
 * Severity weights are Deque's (the same ones the grade uses). Nodes are log-damped so a
 * long tail of minor elements cannot outrank a critical failure; pages are not damped
 * because a fix that clears five pages is worth five times one page.
 */
export function fixFirstScore(rule: GradeRuleHit): number {
  const pages = pagesOf(rule).count;
  return IMPACT_WEIGHT[rule.impact] * pages * (1 + Math.log2(Math.max(1, rule.nodes)));
}

/**
 * The top rules to fix, ranked. Only WCAG A/AA failures qualify: they set the grade, and
 * best-practice rules are worth doing later. `wcagAA` is always set on stored rules.
 */
export function rankFixFirst(rules: GradeRuleHit[] | undefined, limit: number = FIX_FIRST_LIMIT): FixFirstItem[] {
  return (rules ?? [])
    .filter((r) => r.wcagAA)
    .map((r) => ({ r, score: fixFirstScore(r) }))
    .sort((a, b) => b.score - a.score || b.r.nodes - a.r.nodes || a.r.id.localeCompare(b.r.id))
    .slice(0, limit)
    .map(({ r }) => {
      const fix = ruleFix(r.id);
      return {
        ruleId: r.id,
        title: fix?.title ?? r.help,
        impact: r.impact,
        pages: pagesOf(r),
        nodes: r.nodes,
        ...(r.sharedTarget ? { shared: r.sharedTarget } : {}),
        why: fix?.why ?? r.help,
        ...(fix ? { fix: fix.fix } : {}),
      };
    });
}
