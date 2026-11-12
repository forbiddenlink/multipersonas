import type { ReactNode } from "react";

/**
 * The health-department placard: yellow (#FFD60A), the one place that colour is used. The
 * letter is passed in by the caller and must come from the engine's scorer (see
 * `lib/home-placard.ts`); this component only draws it. `foot` is the caption under the rule.
 */
export function Placard({
  letter,
  head,
  foot,
  className = "",
  letterClassName = "",
}: {
  letter: string;
  head: string;
  foot: ReactNode;
  className?: string;
  letterClassName?: string;
}) {
  return (
    <div className={`pa-placard ${className}`}>
      <p className="pa-placard-head">{head}</p>
      <span className={`pa-letter ${letterClassName}`} aria-hidden="true">
        {letter}
      </span>
      <p className="sr-only">Grade {letter}</p>
      <div className="pa-placard-foot">{foot}</div>
    </div>
  );
}
