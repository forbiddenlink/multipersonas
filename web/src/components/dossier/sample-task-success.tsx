"use client";

import { useId, useState } from "react";
import { Meter } from "@/components/forensic/meter";
import { SAMPLE_REPLAY_FRAMES, SAMPLE_TARGET } from "@/lib/sample-evidence";

/**
 * Persona task-success panel — a scrubbable replay of an AI browser agent walking the
 * SauceDemo probe. Explicitly labeled AI opinion, never a compliance verdict: the axe
 * findings inside each frame are real (deterministic), but "did the persona reach its
 * goal" is the model's read of the final page, not a WCAG check.
 */
export function SampleTaskSuccess({ className = "" }: { className?: string }) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const [index, setIndex] = useState(0);
  const frame = SAMPLE_REPLAY_FRAMES[index]!;
  const reachedGoal = index === SAMPLE_REPLAY_FRAMES.length - 1;

  return (
    <div className={`sheet p-6 sm:p-8 ${className}`} role="region" aria-label="Persona task-success replay, sample">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
        <p className="label-mono">Persona replay · {SAMPLE_TARGET.host}</p>
        <span className="redline-note uppercase tracking-[0.1em]">Opinion · AI</span>
      </div>

      <div id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${frame.id}`} className="mt-5">
        <p className="font-mono text-xs text-muted-foreground">
          state <span className="text-foreground">{frame.state}</span>
        </p>
        <p className="mt-2 font-serif text-[0.975rem] italic leading-relaxed">&ldquo;{frame.thought}&rdquo;</p>
        {frame.finding ? (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wide text-[var(--redline)]">
                axe verdict at this state
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{frame.finding.title}</p>
          </div>
        ) : (
          <p className="mt-4 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
            No axe verdict at this state.
          </p>
        )}
      </div>

      <div
        className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-border bg-border"
        role="tablist"
        aria-label="Replay steps"
      >
        {SAMPLE_REPLAY_FRAMES.map((f, i) => {
          const active = i === index;
          return (
            <button
              key={f.id}
              id={`${baseId}-tab-${f.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setIndex(i)}
              className={`bg-card px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className="block font-mono text-[11px] tabular-nums">{f.step}</span>
              <span className="mt-0.5 block truncate font-mono text-xs">{f.state}</span>
            </button>
          );
        })}
      </div>

      <Meter
        className="mt-6 border-t border-border pt-5"
        value={reachedGoal ? 1 : 0}
        total={1}
        label="reached final state"
        unit={reachedGoal ? "checked out" : "still in progress"}
        tone={reachedGoal ? "teal" : "serious"}
      />
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        Illustrative replay from {SAMPLE_TARGET.source}. Task success is the model&apos;s read
        of the final page. It is not a compliance check and is not audited for accuracy here.
      </p>
    </div>
  );
}
