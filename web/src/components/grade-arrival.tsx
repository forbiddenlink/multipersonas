"use client";

import { useEffect, useState } from "react";

export const GRADE_HEADING_ID = "grade-result-heading";

/**
 * Announces the moment a polled grade finishes. The soft refresh swaps the in-progress
 * view for the report without a navigation, so nothing tells a screen-reader user it
 * happened. This stays mounted in a stable spot across the refresh (same component type
 * and position), watches `status`, and on a queued/running -> completed|failed
 * transition speaks a polite message and moves focus to the result heading. A result
 * that was already complete on first load announces nothing.
 */
export function GradeArrival({
  status,
  host,
  grade,
}: {
  status: "queued" | "running" | "completed" | "failed";
  host: string;
  grade?: string;
}) {
  // Previous-prop pattern (react.dev "adjusting state when a prop changes"): compare during
  // render instead of setting state inside an effect.
  const [previous, setPrevious] = useState(status);
  const [message, setMessage] = useState("");
  if (previous !== status) {
    setPrevious(status);
    if (previous === "queued" || previous === "running") {
      if (status === "completed") {
        setMessage(grade ? `Grade complete. ${host} scored ${grade}.` : `Grade complete for ${host}.`);
      } else if (status === "failed") {
        setMessage(`Grade failed for ${host}.`);
      }
    }
  }

  // Focus is a DOM side effect, so it belongs in an effect: move to the result heading
  // once the announcement exists.
  useEffect(() => {
    if (message) document.getElementById(GRADE_HEADING_ID)?.focus();
  }, [message]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
