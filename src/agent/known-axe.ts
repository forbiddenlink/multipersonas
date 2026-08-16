/**
 * Read-only axe context for the persona agent.
 *
 * Personas are navigators, not compliance judges. Once axe has scanned a state,
 * the model must not re-derive, dispute, or re-report those violations — they
 * already live in `axeFindings` and stay there. This formatter is the only
 * bridge: it *shows* current-page verdicts so the persona can keep walking
 * instead of "discovering" color-contrast for the tenth time.
 *
 * Honesty wall: never mutates the findings it is given. Merged only at render
 * (`report/generator.ts` splits axe vs persona). Keep it that way.
 */

export interface KnownAxeFinding {
  pageUrl: string;
  seenOn?: string[];
  severity: string;
  ruleId?: string;
  title: string;
}

/** Cap so a noisy page cannot blow the step's token budget. */
export const MAX_KNOWN_AXE_RULES = 12;

const HEADER =
  "KNOWN AXE VIOLATIONS (ground truth, do not re-derive or dispute). These are already recorded by axe-core. Do not re-report them as accessibility findings. Continue toward your goal.";

function onThisPage(f: KnownAxeFinding, pageUrl: string): boolean {
  if (f.seenOn && f.seenOn.includes(pageUrl)) return true;
  return f.pageUrl === pageUrl;
}

/**
 * Format axe verdicts for the current page as a read-only system note.
 * Returns null when there is nothing to show (empty, or none on this URL)
 * so the agent prompt stays clean.
 */
export function formatKnownAxeForPage(
  findings: readonly KnownAxeFinding[],
  pageUrl: string,
): string | null {
  const onPage = findings.filter((f) => onThisPage(f, pageUrl));
  if (onPage.length === 0) return null;

  // One line per rule — a color-contrast hit on 40 buttons is still one fact.
  const byRule = new Map<string, { severity: string; title: string; count: number }>();
  for (const f of onPage) {
    const key = f.ruleId ?? f.title;
    const existing = byRule.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byRule.set(key, { severity: f.severity, title: f.title, count: 1 });
  }

  const rows = [...byRule.entries()];
  const shown = rows.slice(0, MAX_KNOWN_AXE_RULES);
  const omitted = rows.length - shown.length;

  const lines = shown.map(([rule, row]) => {
    const count = row.count > 1 ? ` (${row.count} elements)` : "";
    return `- [${row.severity}] ${rule}: ${row.title}${count}`;
  });
  if (omitted > 0) {
    lines.push(`- +${omitted} more rule${omitted === 1 ? "" : "s"} omitted`);
  }

  return `${HEADER}\n${lines.join("\n")}`;
}
