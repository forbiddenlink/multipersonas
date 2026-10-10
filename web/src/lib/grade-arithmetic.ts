import { SEVERITIES } from "@engine/domain/vocab";
import { GRADE_BANDS, IMPACT_WEIGHT, type GradeReport } from "@engine/grader/score";

/**
 * The numbers behind a stored grade, read from the same constants the grader uses
 * (`IMPACT_WEIGHT`, `GRADE_BANDS`) so this page cannot describe a rule the grader does not
 * apply. The site score is the rounded mean of the page scores; that mean is recomputed
 * here and compared to the stored score, so a report the formula does not reproduce is
 * flagged instead of presented as worked arithmetic.
 */
export type GradeArithmetic = {
  pageScores: number[];
  /** Rounded mean of `pageScores`; 0 when there are none. */
  mean: number;
  /** True when the recomputed mean equals the stored score. */
  reproduces: boolean;
  weights: { impact: (typeof SEVERITIES)[number]; weight: number }[];
  /** Best letter first, then the F floor. */
  bands: { grade: GradeReport["grade"]; label: string }[];
};

export function gradeArithmetic(report: GradeReport): GradeArithmetic {
  const pageScores = (report.perPage ?? []).map((p) => p.score);
  const mean =
    pageScores.length === 0
      ? 0
      : Math.round(pageScores.reduce((sum, s) => sum + s, 0) / pageScores.length);

  const bands = GRADE_BANDS.map((band, i) => {
    const above = GRADE_BANDS[i - 1];
    return {
      grade: band.grade,
      label: above ? `${band.min} to ${above.min - 1}` : `${band.min} to 100`,
    };
  });
  const floor = GRADE_BANDS[GRADE_BANDS.length - 1];
  bands.push({ grade: "F", label: `0 to ${floor ? floor.min - 1 : 100}` });

  return {
    pageScores,
    mean,
    reproduces: pageScores.length > 0 && mean === report.score,
    weights: SEVERITIES.map((impact) => ({ impact, weight: IMPACT_WEIGHT[impact] })),
    bands,
  };
}
