"use client";

import { useSyncExternalStore } from "react";
import type { GradeReport } from "@engine/grader/score";
import { GradeCopyLink } from "@/components/dossier/grade-copy-link";
import { trackProductEvent } from "@/lib/analytics";
import {
  SHARE_FALLBACK_ORIGIN,
  linkedInShareUrl,
  shareText,
  xShareUrl,
} from "@/lib/grade-share";

const subscribeNoop = () => () => {};

const shareLinkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-card px-4 text-sm text-foreground transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Share row for a finished grade: LinkedIn, X, and copy-link. The text states what was
 * measured ("scored B on Personaudit's automated accessibility grade") and never claims
 * compliance. Links open the provider's own share screen; nothing is posted from here.
 */
export function GradeShare({
  token,
  host,
  grade,
}: {
  token: string;
  host: string;
  grade: GradeReport["grade"];
}) {
  // Server and hydration renders use the fallback, then the real origin takes over.
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => SHARE_FALLBACK_ORIGIN,
  );
  const resultUrl = `${origin}/grade/${token}`;
  const text = shareText(host, grade);

  return (
    <div role="group" aria-labelledby="grade-share-heading">
      <h2 id="grade-share-heading" className="label-mono">
        Share this grade
      </h2>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        <a
          href={linkedInShareUrl(resultUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareLinkClass}
          onClick={() => trackProductEvent("grade_shared", { channel: "linkedin" })}
        >
          Share on LinkedIn{" "}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <a
          href={xShareUrl(text, resultUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareLinkClass}
          onClick={() => trackProductEvent("grade_shared", { channel: "x" })}
        >
          Share on X{" "}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <GradeCopyLink token={token} />
      </div>
    </div>
  );
}
