// Evidence Dossier palette + typography for Remotion clips.
// Self-contained (this package is deliberately excluded from the pnpm workspace) —
// values mirror web/DESIGN.md and web/src/app/globals.css.
// Rendered in headless Chromium where CSS custom properties are avoided.

export const COLORS = {
  bg: "#f7f4ee", // warm manila desk
  panel: "#fefdfb", // paper sheet
  fg: "#1d212a", // blue-black ink
  muted: "#5c6370", // secondary ink
  primary: "#1e3a8a", // carbon ink blue
  border: "#ded8cd", // ruled hairline
  redline: "#dc2626", // redline annotator / stamp
  highlight: "#fef08a", // highlighter yellow
  shadow: "rgba(29, 33, 42, 0.12)",
} as const;

// Colorblind-safe severity glyph + color (matches web/src/components/forensic/severity.ts).
export const SEVERITY: Record<string, { glyph: string; color: string; label: string }> = {
  critical: { glyph: "■", color: "#dc2626", label: "Critical" },
  serious: { glyph: "▲", color: "#d97706", label: "Serious" },
  moderate: { glyph: "◆", color: "#ca8a04", label: "Moderate" },
  minor: { glyph: "●", color: "#475569", label: "Minor" },
};

export function severity(value: string) {
  return SEVERITY[value] ?? SEVERITY.minor;
}

// Frustration band -> heat color (mirrors web/src/lib/frustration.ts frustrationBand).
export function frustrationColor(score: number): { label: string; color: string } {
  if (score < 25) return { label: "calm", color: COLORS.muted };
  if (score < 50) return { label: "friction", color: SEVERITY.moderate.color };
  if (score < 75) return { label: "struggling", color: SEVERITY.serious.color };
  return { label: "blocked", color: SEVERITY.critical.color };
}

export const FONT_MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace";
export const FONT_SERIF = "'Newsreader', 'Source Serif 4', Georgia, serif";
export const FONT_SANS = "'IBM Plex Sans', -apple-system, system-ui, sans-serif";
