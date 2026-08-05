"use client";

import { useId, useState } from "react";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { SAMPLE_REPLAY_FRAMES, SAMPLE_TARGET } from "@/lib/sample-evidence";

/**
 * Signature marketing interaction: scrub a persona walk through real probe states
 * (SauceDemo) and see the axe verdict that landed there.
 */
export function ReplayStrip({ className = "" }: { className?: string }) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const [index, setIndex] = useState(2);
  const frame = SAMPLE_REPLAY_FRAMES[index]!;
  const activeTabId = `${baseId}-tab-${frame.id}`;

  return (
    <div
      className={`overflow-hidden rounded-md border border-border bg-card ${className}`}
      role="region"
      aria-label="Persona replay sample"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›</span>
        <span>replay — {SAMPLE_TARGET.host}</span>
        <span className="ml-auto tabular-nums">
          step {frame.step}/{String(SAMPLE_REPLAY_FRAMES.length).padStart(2, "0")}
        </span>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
        className="border-b border-border px-4 py-4"
      >
        <p className="font-mono text-xs text-muted-foreground">
          <span className="select-none text-[var(--primary)]">›&nbsp;</span>
          state <span className="text-foreground">{frame.state}</span>
        </p>
        <p className="mt-3 font-serif text-sm leading-relaxed text-card-foreground italic">
          “{frame.thought}”
        </p>
        {frame.finding ? (
          <div className="mt-4 space-y-2 rounded-sm border border-border bg-background px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={frame.finding.severity} ruleId={frame.finding.wcag} />
              <WcagCitation code={frame.finding.wcag} />
            </div>
            <p className="text-sm text-foreground">{frame.finding.title}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              evidence captured here · axe-core verdict
            </p>
          </div>
        ) : (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            no axe verdict at this state
          </p>
        )}
      </div>

      <div className="flex items-stretch divide-x divide-border" role="tablist" aria-label="Replay steps">
        {SAMPLE_REPLAY_FRAMES.map((f, i) => {
          const active = i === index;
          const tabId = `${baseId}-tab-${f.id}`;
          return (
            <button
              key={f.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setIndex(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") {
                  return;
                }
                e.preventDefault();
                const last = SAMPLE_REPLAY_FRAMES.length - 1;
                let next = i;
                if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
                if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
                if (e.key === "Home") next = 0;
                if (e.key === "End") next = last;
                setIndex(next);
                // Move focus to the newly selected tab after React commits.
                queueMicrotask(() => {
                  document.getElementById(`${baseId}-tab-${SAMPLE_REPLAY_FRAMES[next]!.id}`)?.focus();
                });
              }}
              className={`flex-1 px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span className="block font-mono text-[11px] tabular-nums">{f.step}</span>
              <span className="mt-0.5 block truncate font-mono text-xs">{f.state}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
