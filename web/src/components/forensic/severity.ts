// Single source of truth for the axe severity vocabulary. Every surface (terminal,
// chip, results, report) reads shape + token + label from here so severity is always
// rendered as color + icon + text — never color alone — and stays consistent.
//
// Shapes are deliberately distinct (square / triangle / diamond / circle) so the four
// levels are distinguishable without color, satisfying the colorblind-safe requirement.

export type Severity = "critical" | "serious" | "moderate" | "minor";

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "serious",
  "moderate",
  "minor",
];

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

export function isSeverity(value: string): value is Severity {
  return value === "critical" || value === "serious" || value === "moderate" || value === "minor";
}

/** Resolve any incoming string to a severity token, defaulting unknown → minor. */
export function severityToken(value: string): string {
  return isSeverity(value) ? SEVERITY[value].token : SEVERITY.minor.token;
}

export function severityMeta(value: string): SeverityMeta {
  return isSeverity(value) ? SEVERITY[value] : SEVERITY.minor;
}
