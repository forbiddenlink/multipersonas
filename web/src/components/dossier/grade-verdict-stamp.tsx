import type { GradeReport } from "@engine/grader/score";

/**
 * The letter grade rendered as the case-file verdict stamp (DESIGN.md `.stamp`).
 * Grade bands reuse the severity vocabulary rather than a separate "good/bad" palette:
 * A/B carry the ink-blue primary, C escalates through moderate/serious, D/F land on
 * the same redline used for a critical axe finding.
 */
function gradeStampColor(grade: GradeReport["grade"]): string {
  if (grade === "A" || grade === "B") return "var(--primary)";
  if (grade === "C") return "var(--severity-moderate)";
  if (grade === "D") return "var(--severity-serious)";
  return "var(--severity-critical)";
}

export function GradeVerdictStamp({
  grade,
  score,
  className = "",
}: {
  grade: GradeReport["grade"];
  score: number;
  className?: string;
}) {
  return (
    <div
      className={`stamp shrink-0 ${className}`}
      style={{ color: gradeStampColor(grade), borderColor: gradeStampColor(grade), outlineColor: gradeStampColor(grade) }}
      aria-label={`Verdict: grade ${grade}, score ${score} of 100`}
    >
      <span className="text-[2.1rem] leading-none tracking-[0.02em]">{grade}</span>
      <span className="text-[0.65rem] tracking-[0.14em]">{score} / 100</span>
    </div>
  );
}
