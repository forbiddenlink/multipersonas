"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  claimedMessage,
  clearRememberedGradeTokens,
  readRememberedGradeTokens,
} from "@/lib/grade-tokens";
import { trackProductEvent } from "@/lib/analytics";

/**
 * After signup/login, attach any public grades this browser ran while signed out.
 * Possession of the share token is the authorization; the API refuses to steal a
 * grade another account already claimed. Says so once when grades attached.
 */
export function ClaimGrades() {
  const router = useRouter();
  const ran = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

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
        if (claimed > 0) {
          trackProductEvent("grades_claimed", { count: claimed });
          setMessage(claimedMessage(claimed));
          router.refresh();
        }
      })
      .catch(() => {
        // Claiming is best-effort; the tokens stay until the next signed-in visit.
      });
  }, [router]);

  // Brief confirmation, once: the grades appear in the lists below without any other cue.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div role="status" aria-live="polite">
      {message ? <p className="mb-4 border-l-2 border-primary pl-3 text-sm">{message}</p> : null}
    </div>
  );
}
