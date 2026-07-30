// Forensic-terminal palette + vocabulary for the clip. Self-contained (this package is
// intentionally outside the web workspace) — the few values here mirror web/src/app/globals.css
// and web/src/components/forensic/severity.ts. Literal hex, not oklch vars: Remotion renders in
// a headless browser where the app's CSS custom properties do not exist.

export const COLORS = {
  bg: "#17130e", // warm near-black (matches --background dark)
  panel: "#211c16", // --card
  fg: "#f4f1ec", // --foreground
  muted: "#a9a29a", // --muted-foreground (AA on bg)
  primary: "#4ecdc0", // teal — live/cursor only
  border: "#3a332b",
} as const;

// Colorblind-safe severity glyph + color (matches forensic/severity.ts).
export const SEVERITY: Record<string, { glyph: string; color: string; label: string }> = {
  critical: { glyph: "■", color: "#e5484d", label: "Critical" },
  serious: { glyph: "▲", color: "#e8963f", label: "Serious" },
  moderate: { glyph: "◆", color: "#d9c04a", label: "Moderate" },
  minor: { glyph: "●", color: "#7aa2f7", label: "Minor" },
};

export function severity(value: string) {
  return SEVERITY[value] ?? SEVERITY.minor;
}

// Frustration band → heat color (mirrors web/src/lib/frustration.ts frustrationBand).
export function frustrationColor(score: number): { label: string; color: string } {
  if (score < 25) return { label: "calm", color: COLORS.muted };
  if (score < 50) return { label: "friction", color: SEVERITY.moderate.color };
  if (score < 75) return { label: "struggling", color: SEVERITY.serious.color };
  return { label: "blocked", color: SEVERITY.critical.color };
}

export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
export const FONT_SERIF = "'Source Serif 4', Georgia, serif";
export const FONT_SANS = "Inter, system-ui, sans-serif";
