"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  clearRememberedGradeTokens,
  readRememberedGradeTokens,
} from "@/lib/grade-tokens";

/**
 * After signup/login, attach any public grades this browser ran while signed out.
 * Possession of the share token is the authorization; the API refuses to steal a
 * grade another account already claimed.
 */
export function ClaimGrades() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tokens = readRememberedGradeTokens();
    if (tokens.length === 0) return;

    void fetch("/api/grade/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    })
      .then(async (res) => {
        if (res.status === 401) return;
        if (!res.ok) return;
        const body: unknown = await res.json().catch(() => null);
        const claimed =
          body && typeof body === "object" && "claimed" in body && typeof body.claimed === "number"
            ? body.claimed
            : 0;
        clearRememberedGradeTokens();
        if (claimed > 0) router.refresh();
      })
      .catch(() => {
        // Claiming is best-effort; the tokens stay until the next signed-in visit.
      });
  }, [router]);

  return null;
}
