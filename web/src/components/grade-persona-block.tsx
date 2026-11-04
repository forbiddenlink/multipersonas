import Link from "next/link";
import { displayPath } from "@/lib/format";
import { personaOutcomeLine } from "@/lib/grade-persona";
import type { LoadedGradePersona } from "@/lib/grade-persona-load";
import { GradePersonaPoll } from "@/components/grade-persona-poll";

/**
 * "One AI visitor tried your site". Sits below the grade, never inside it: the letter and
 * score come from axe alone, and the copy here says so. One simulated visitor's navigation
 * and opinion only; no accessibility verdict, no person with a disability.
 */
export function GradePersonaBlock({ persona }: { persona: LoadedGradePersona }) {
  const { view, screenshotUrl } = persona;

  return (
    <section id="ai-visitor" aria-labelledby="ai-visitor-heading" className="grade-print-hide space-y-4 scroll-mt-6">
      <h2 id="ai-visitor-heading" className="display text-2xl sm:text-3xl">
        One AI visitor tried your site
      </h2>

      {view.kind === "pending" && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            A simulated visitor is looking around your site now. This section fills in when it finishes.
            Your grade above is final and does not depend on it.
          </p>
          <GradePersonaPoll />
        </>
      )}

      {view.kind === "not_run" && (
        <p className="text-sm text-muted-foreground">
          The AI visitor was not run for this grade. Your grade above is unaffected.
        </p>
      )}

      {view.kind === "ready" && (
        <div className="space-y-4">
          <p className="text-base leading-relaxed">
            {view.personaName ? <strong>{view.personaName}</strong> : "The visitor"}
            {view.personaDescription ? `, ${view.personaDescription}, ` : " "}
            visited your site. {personaOutcomeLine(view.outcome, view.totalSteps)}
          </p>

          {screenshotUrl && (
            <figure className="max-w-xl space-y-2">
              {/* Signed, short-lived private URL; plain img avoids next/image remote config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt={`Screenshot of the page where the AI visitor stopped${view.pageUrl ? `: ${displayPath(view.pageUrl)}` : ""}`}
                className="w-full border border-border"
                loading="lazy"
              />
              {view.pageUrl && (
                <figcaption className="font-mono text-xs text-muted-foreground">
                  Where it stopped: {displayPath(view.pageUrl)}
                </figcaption>
              )}
            </figure>
          )}

          {view.quotes.length > 0 && (
            <ul className="space-y-2">
              {view.quotes.map((q) => (
                <li key={q}>
                  <blockquote className="border-l-2 border-foreground pl-3 text-sm italic leading-relaxed">
                    {q}
                  </blockquote>
                </li>
              ))}
            </ul>
          )}

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This is one simulated visitor&apos;s read on clarity, not a test of accessibility, and it does
            not change your grade. Paid audits run more visitors, on phone and keyboard, and keep the
            replay.{" "}
            <Link href="/pricing" className="text-link">
              See paid audits
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
