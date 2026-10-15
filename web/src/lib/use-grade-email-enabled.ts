"use client";

import { useEffect, useState } from "react";

/**
 * Whether the server can actually deliver a grade email (mail provider configured and the
 * storage migration applied). Fail closed: false until the server says true, and false on any
 * network or parse failure, so the optional field never appears for a feature that cannot work.
 */
export function useGradeEmailEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/grade/email");
        if (!res || !res.ok) return;
        const data = (await res.json()) as { enabled?: unknown };
        if (!cancelled && data.enabled === true) setEnabled(true);
      } catch {
        // Stay hidden.
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
