import { useRef } from "react";

export function useCountUp(target: number) {
  // Show the real number on first paint. Counting up from 0 left lawsuit stats at
  // $0 whenever IntersectionObserver never fired (below-fold, high threshold).
  const ref = useRef<HTMLElement>(null);
  return { value: target, ref };
}
