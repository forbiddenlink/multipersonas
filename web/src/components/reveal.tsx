import type { CSSProperties, ReactNode } from "react";

/**
 * Structural wrapper for sections that used to reveal on scroll.
 * Content stays visible by default so static captures, no-JS sessions, and crawlers never see blank sections.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const style: CSSProperties | undefined = delay
    ? { transitionDelay: `${delay}ms` }
    : undefined;

  return (
    <div data-reveal className={className} style={style}>
      {children}
    </div>
  );
}
