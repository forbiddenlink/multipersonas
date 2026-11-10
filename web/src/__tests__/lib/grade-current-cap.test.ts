import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));

import { currentGradeReport, gradeLetterFromReport } from "@/lib/grade";
import type { Json } from "@/lib/supabase/types";

// Shape of the 2026-10-06 W3C "bad" demo grade: stored before the severity cap existed.
const preCap = {
  grade: "A",
  score: 98,
  rules: [
    { id: "image-alt", impact: "critical", nodes: 1, help: "Images must have alternative text", wcagAA: true },
    { id: "region", impact: "moderate", nodes: 91, help: "All page content should be contained by landmarks", wcagAA: false },
  ],
} as unknown as Json;

describe("stored grades read under the current severity cap", () => {
  it("shows C, not the stored A, for a pre-cap report with a critical WCAG failure", () => {
    expect(gradeLetterFromReport(preCap)).toBe("C");
    expect(currentGradeReport(preCap)).toMatchObject({ grade: "C", score: 98, cappedOnRead: true });
  });

  it("passes non-reports through untouched", () => {
    expect(gradeLetterFromReport(null)).toBeNull();
    expect(currentGradeReport([] as unknown as Json)).toEqual([]);
  });
});
