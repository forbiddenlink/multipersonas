"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Soft-refresh the server component while the AI visitor is still running. Stops by itself
 * once the section leaves the pending state (this component unmounts) or after the deadline.
 * Same pattern as GradePoll: router.refresh() keeps scroll and focus, no meta refresh. */
const DEADLINE_MS = 3 * 60 * 1000;

export function GradePersonaPoll() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started >= DEADLINE_MS) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 6000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
