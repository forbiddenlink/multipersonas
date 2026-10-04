import { PALETTE } from "@/lib/og-palette";
import type { GradeReport } from "@engine/grader/score";

/** Text colours used on the SVG badge; contrast against each fill is tested. */
export const BADGE_TEXT_ON_GRADE = "#f4f1ec";
export const BADGE_LABEL_TEXT = "#a39e95";
export const BADGE_LABEL_BG = PALETTE.ink;

export function badgeGradeColor(grade: GradeReport["grade"]): string {
  if (grade === "A" || grade === "B") return PALETTE.primary;
  if (grade === "C") return PALETTE.moderate;
  if (grade === "D") return PALETTE.serious;
  return PALETTE.redline;
}

export function relativeLuminance(hex: string): number {
  const channel = (i: number): number => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
