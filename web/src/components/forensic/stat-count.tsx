"use client";

import { useCountUp } from "@/hooks/use-count-up";

export function StatCount({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { value: displayed, ref } = useCountUp(value, { duration: 1800 });
  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={`tabular-nums ${className}`}
      aria-label={`${prefix}${value.toLocaleString()}${suffix}`}
    >
      {prefix}{displayed.toLocaleString()}{suffix}
    </span>
  );
}
