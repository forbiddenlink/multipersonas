import { SEVERITIES, isSeverity, type Severity } from "@engine/domain/vocab";

// Single source of truth for web severity presentation. The vocabulary itself lives
// in the engine domain module; every web surface reads shape + token + label here
// so severity is always rendered as color + icon + text — never color alone.
//
// Shapes are deliberately distinct (square / triangle / diamond / circle) so the four
// levels are distinguishable without color, satisfying the colorblind-safe requirement.

export type { Severity };

export const SEVERITY_ORDER: Severity[] = [...SEVERITIES];

type SeverityMeta = {
  label: string;
  /** CSS var carrying the verified-AA color for this level (both themes). */
  token: string;
  /** Colorblind-safe glyph — a distinct shape per level, not just a colored dot. */
  glyph: string;
};

export const SEVERITY: Record<Severity, SeverityMeta> = {
  critical: { label: "Critical", token: "var(--severity-critical)", glyph: "■" },
  serious: { label: "Serious", token: "var(--severity-serious)", glyph: "▲" },
  moderate: { label: "Moderate", token: "var(--severity-moderate)", glyph: "◆" },
  minor: { label: "Minor", token: "var(--severity-minor)", glyph: "●" },
};

export { isSeverity };

/** Resolve any incoming string to a severity token, defaulting unknown → minor. */
export function severityToken(value: string): string {
  return isSeverity(value) ? SEVERITY[value].token : SEVERITY.minor.token;
}

export function severityMeta(value: string): SeverityMeta {
  return isSeverity(value) ? SEVERITY[value] : SEVERITY.minor;
}
