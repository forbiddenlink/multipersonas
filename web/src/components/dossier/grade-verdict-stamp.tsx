"use client";

import { useLayoutEffect, useRef } from "react";
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

const COUNT_MS = 900;
const LAND_MS = 420;

function prefersReducedMotion(): boolean {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The stamp is a single image to assistive tech (`role="img"` + label with the final
 * values), so the visible letters are never read twice and the count-up never reaches a
 * screen reader. The DOM always holds the final score; the landing and count-up are
 * decoration applied after mount and skipped entirely under prefers-reduced-motion.
 */
export function GradeVerdictStamp({
  grade,
  score,
  className = "",
  animate = false,
}: {
  grade: GradeReport["grade"];
  score: number;
  className?: string;
  /** Land the stamp and count the score up once, on mount. */
  animate?: boolean;
}) {
  const stampRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!animate || prefersReducedMotion()) return;
    const stamp = stampRef.current;
    const scoreEl = scoreRef.current;
    if (!stamp || !scoreEl) return;

    let raf = 0;
    const landing =
      typeof stamp.animate === "function"
        ? stamp.animate(
            [
              { opacity: 0, transform: "rotate(-14deg) scale(1.6)" },
              { opacity: 1, transform: "rotate(-2deg) scale(0.96)", offset: 0.7 },
              { opacity: 1, transform: "rotate(-4deg) scale(1)" },
            ],
            { duration: LAND_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
          )
        : null;

    const start = performance.now();
    scoreEl.textContent = "0";
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - (1 - t) ** 3;
      scoreEl.textContent = String(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      landing?.cancel();
      scoreEl.textContent = String(score);
    };
  }, [animate, score]);

  const color = gradeStampColor(grade);
  return (
    <div
      ref={stampRef}
      role="img"
      className={`stamp shrink-0 ${className}`}
      style={{ color, borderColor: color, outlineColor: color }}
      aria-label={`Verdict: grade ${grade}, score ${score} of 100`}
    >
      <span aria-hidden="true" className="text-[2.1rem] leading-none tracking-[0.02em]">
        {grade}
      </span>
      <span aria-hidden="true" className="text-[0.65rem] tracking-[0.14em]">
        <span ref={scoreRef}>{score}</span> / 100
      </span>
    </div>
  );
}
