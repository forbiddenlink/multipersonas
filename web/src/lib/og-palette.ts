// Evidence Dossier palette as literal hex for surfaces that cannot read CSS variables:
// next/og (Satori), raster icon generation, <meta theme-color>, the SVG grade badge, and
// the global error fallback. Each value is the sRGB conversion of the matching oklch token
// in src/app/globals.css (web/DESIGN.md). Change a token there, change it here.
export const PALETTE = {
  desk: "#f8f4eb", // --background
  sheet: "#fefdfa", // --card
  ink: "#141b26", // --foreground
  muted: "#515865", // --muted-foreground
  rule: "#d6cfc1", // --border
  redline: "#b71a18", // --redline, --severity-critical
  highlight: "#f8e899", // --highlight
  primary: "#1d3c86", // --primary (ink blue)
  serious: "#9d521a", // --severity-serious
  moderate: "#7e5d14", // --severity-moderate
} as const;

/** Night-desk variant (.dark block in globals.css). */
export const PALETTE_DARK = {
  desk: "#0d1117", // --background
  sheet: "#151a21", // --card
  ink: "#eeebe2", // --foreground
  muted: "#a9a498", // --muted-foreground
  redline: "#f47c6e", // --redline
  primary: "#9ac0f8", // --primary
  onPrimary: "#0a111f", // --primary-foreground
} as const;
