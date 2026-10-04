"use client";

import { useEffect, useRef, useState } from "react";
import { gradeFailureReason, trackProductEvent } from "@/lib/analytics";

export const GRADE_HEADING_ID = "grade-result-heading";

// One outcome event per grade token for the life of the page, however often the
// component remounts. The token itself is never sent as a property.
const reportedTokens = new Set<string>();

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
  token,
  pagesScanned,
  createdAt,
  error,
}: {
  status: "queued" | "running" | "completed" | "failed";
  host: string;
  grade?: string;
  /** Used only to fire the outcome event once per grade; never sent to analytics. */
  token?: string;
  pagesScanned?: number;
  createdAt?: string;
  error?: string | null;
}) {
  // Analytics: fire once when a grade WE WATCHED finishes. A result that was already
  // complete on first load is not a funnel step, so the first status is the baseline.
  const lastStatus = useRef(status);
  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = status;
    if ((was !== "queued" && was !== "running") || !token) return;
    if (status !== "completed" && status !== "failed") return;
    if (reportedTokens.has(token)) return;
    reportedTokens.add(token);

    if (status === "completed") {
      const started = createdAt ? Date.parse(createdAt) : NaN;
      trackProductEvent("grade_completed", {
        grade,
        pages: pagesScanned,
        ms_to_result: Number.isFinite(started) ? Math.max(0, Date.now() - started) : undefined,
      });
    } else {
      trackProductEvent("grade_failed", { reason: gradeFailureReason(error) });
    }
  }, [status, token, grade, pagesScanned, createdAt, error]);

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
