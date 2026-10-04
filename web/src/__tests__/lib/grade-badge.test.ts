import { describe, expect, it } from "vitest";
import {
  BADGE_LABEL_BG,
  BADGE_LABEL_TEXT,
  BADGE_TEXT_ON_GRADE,
  badgeGradeColor,
  contrastRatio,
} from "@/lib/grade-badge";

describe("grade badge colours", () => {
  it("computes WCAG contrast correctly", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  it.each(["A", "B", "C", "D", "F"] as const)("grade %s text meets 4.5:1", (grade) => {
    expect(contrastRatio(BADGE_TEXT_ON_GRADE, badgeGradeColor(grade))).toBeGreaterThanOrEqual(4.5);
  });
  it("label text meets 4.5:1 on the label fill", () => {
    expect(contrastRatio(BADGE_LABEL_TEXT, BADGE_LABEL_BG)).toBeGreaterThanOrEqual(4.5);
  });
});
