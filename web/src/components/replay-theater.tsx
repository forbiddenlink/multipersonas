"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { frustrationBand } from "@/lib/frustration";
import { formatLocation } from "@/lib/format-location";
import { SeverityChip } from "@/components/forensic/severity-chip";
import type { PersonaJourney } from "@/lib/journey";

export interface ReplayFinding {
  severity: string;
  title: string;
}

export interface ReplayTheaterProps {
  journeys: PersonaJourney[];
  /** personaId -> display name/role, resolved server-side from PERSONA_DATA. */
  personaMeta: Record<string, { name: string; role: string }>;
  /** axe findings keyed by the exact page_url they were seen on. */
  findingsByUrl: Record<string, ReplayFinding[]>;
  initialPersona?: string;
  initialStep?: number;
  taskCheck?: boolean;
}

const PLAY_INTERVAL_MS = 1600;
/** A finish-step monologue can run several paragraphs; clamp the long ones. */
const MONOLOGUE_CLAMP_CHARS = 280;

/**
 * The persona's inner monologue as a serif quote. Long ones (the finish summary
 * especially) clamp to a few lines with a show-more toggle so the theater stays
 * scannable. Reset per frame by the caller keying on (persona, step).
 */
function Monologue({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > MONOLOGUE_CLAMP_CHARS;
  return (
    <div className="mt-2">
      <p
        className={`font-serif text-[15px] italic leading-relaxed text-foreground ${
          isLong && !expanded ? "line-clamp-5" : ""
        }`}
      >
        &ldquo;{text}&rdquo;
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-1 font-mono text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          {expanded ? "show less" : "show more"}
        </button>
      )}
    </div>
  );
}

/**
 * Persona Replay Theater: a scrubbable evidence timeline of one persona's walk. Each frame
 * pairs the screenshot with the persona's inner monologue, the axe verdict captured at that
 * exact state, and a derived frustration signal. Play, step, scrub, or deep-link to a moment.
 *
 * Honesty wall: the frustration ribbon and the persona's reasoning are inferred UX signals,
 * never a compliance verdict. The SeverityChip is reserved for the deterministic axe finding.
 */
export function ReplayTheater({
  journeys,
  personaMeta,
  findingsByUrl,
  initialPersona,
  initialStep = 0,
  taskCheck = false,
}: ReplayTheaterProps) {
  const initialPersonaIndex = Math.max(
    0,
    journeys.findIndex((j) => j.personaId === initialPersona),
  );
  const [pIdx, setPIdx] = useState(initialPersonaIndex === -1 ? 0 : initialPersonaIndex);
  // Caller renders this only when journeys.length > 0 (audits/[id]/page.tsx), and pIdx is
  // always a clamped valid index — so the journey is guaranteed present.
  const journey = journeys[pIdx]!;
  const stepCount = journey.steps.length;

  const [sIdx, setSIdx] = useState(() =>
    Math.min(Math.max(initialStep, 0), Math.max(stepCount - 1, 0)),
  );
  const [playing, setPlaying] = useState(false);
  const atEnd = sIdx >= stepCount - 1;
  // `playing` may linger true after the last frame; the effect just stops scheduling, so
  // derive the real state for the UI rather than clearing it inside the effect.
  const isPlaying = playing && !atEnd;

  const selectPersona = useCallback((next: number) => {
    setPIdx(next);
    setSIdx(0);
    setPlaying(false);
  }, []);

  // Autoplay: advance one frame per tick. Stops scheduling at the last frame (no setState
  // in the effect body — `isPlaying` derives the stopped state).
  useEffect(() => {
    if (!playing || atEnd) return;
    const t = setTimeout(() => setSIdx((s) => Math.min(s + 1, stepCount - 1)), PLAY_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, atEnd, stepCount]);

  // Keep the URL in sync so any moment is deep-linkable — replaceState, no navigation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("persona", journey.personaId);
    params.set("step", String(sIdx));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [journey.personaId, sIdx]);

  // sIdx is clamped to [0, stepCount-1] and every journey has ≥1 step.
  const step = journey.steps[sIdx]!;
  const band = frustrationBand(step.frustration);
  const findingsHere = (step.pageUrl && findingsByUrl[step.pageUrl]) || [];
  const location = formatLocation(step.pageUrl ?? undefined);

  const go = useCallback(
    (delta: number) => {
      setPlaying(false);
      setSIdx((s) => Math.min(Math.max(s + delta, 0), stepCount - 1));
    },
    [stepCount],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (sIdx < stepCount - 1) setPlaying((p) => !p);
      }
    },
    [go, sIdx, stepCount],
  );

  const meta = personaMeta[journey.personaId] ?? { name: journey.personaId, role: "" };

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyMoment = useCallback(async () => {
    // The URL already carries ?persona&step (kept in sync above), so this deep-links to the
    // exact frame. The link still requires the owner's auth to open — no private data leaks.
    setCopyError(null);
    setCopied(false);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError("Could not copy. Copy the link from your browser's address bar.");
    }
  }, []);

  const baseId = useId();
  const panelId = `${baseId}-panel`;

  return (
    <section
      aria-label="Persona replay"
      className="overflow-hidden rounded-md border border-border bg-card"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Console header + persona switcher */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 font-mono text-xs">
        <span className="text-[var(--primary)]">›</span>
        <span className="text-muted-foreground">replay</span>
        {journeys.length > 1 ? (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Personas">
            {journeys.map((j, i) => {
              const m = personaMeta[j.personaId] ?? { name: j.personaId };
              const active = i === pIdx;
              const tabId = `${baseId}-tab-${j.personaId}`;
              return (
                <button
                  key={j.personaId}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={panelId}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectPersona(i)}
                  onKeyDown={(e) => {
                    if (
                      e.key !== "ArrowRight" &&
                      e.key !== "ArrowLeft" &&
                      e.key !== "Home" &&
                      e.key !== "End"
                    ) {
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    const last = journeys.length - 1;
                    let next = i;
                    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
                    if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
                    if (e.key === "Home") next = 0;
                    if (e.key === "End") next = last;
                    selectPersona(next);
                    queueMicrotask(() => {
                      document.getElementById(`${baseId}-tab-${journeys[next]!.personaId}`)?.focus();
                    });
                  }}
                  className={`rounded-sm border px-2 py-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                    active
                      ? "border-[var(--primary)] text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-foreground">{meta.name}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span
            className="rounded-sm border px-1.5 py-0.5"
            style={{
              borderColor: journey.goalCompleted
                ? "var(--severity-minor)"
                : "var(--severity-critical)",
              color: journey.goalCompleted
                ? "var(--severity-minor)"
                : "var(--severity-critical)",
            }}
          >
            {taskCheck ? (journey.goalCompleted ? "text observed" : "not verified") : (journey.goalCompleted ? "goal reached" : "blocked")}
          </span>
        </span>
      </div>

      {copyError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{copyError}</p>}

      <div id={panelId} role="tabpanel" className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Frame viewport */}
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span className="min-w-0 truncate">{location || "—"}</span>
            <span className="shrink-0 tabular-nums">
              frame {sIdx + 1} / {stepCount}
            </span>
          </div>
          <div className="relative min-h-[240px] flex-1 bg-background">
            {step.screenshotUrl ? (
              // Signed, short-lived private URL — plain img avoids next/image remote config
              // and the query-string signing next/image would strip. Fills the pane so a
              // tall narration column never leaves a dead band under the frame.
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.screenshotUrl}
                  alt={`${meta.name} — step ${sIdx + 1}: ${step.action}`}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 motion-reduce:transition-none"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const placeholder = el.nextElementSibling as HTMLElement | null;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
                <div
                  className="absolute inset-0 hidden items-center justify-center px-6 text-center font-mono text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  screenshot expired — reload to refresh
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center px-6 text-center font-mono text-xs text-muted-foreground">
                no frame captured for this step
              </div>
            )}
          </div>
        </div>

        {/* Narration + evidence at this state */}
        <div className="flex flex-col gap-4 p-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {step.action}
              {step.detail ? <span className="normal-case"> — {step.detail}</span> : null}
            </p>
            {step.reasoning ? (
              // Keyed by frame so a long finish monologue re-collapses when you scrub away.
              <Monologue key={`${pIdx}-${sIdx}`} text={step.reasoning} />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No narration recorded for this step.
              </p>
            )}
          </div>

          {!taskCheck && <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              inferred frustration
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm tabular-nums" style={{ color: band.token }}>
                {step.frustration}
              </span>
              <span className="text-xs" style={{ color: band.token }}>
                {band.label}
              </span>
            </div>
          </div>}

          {findingsHere.length > 0 && (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                evidence captured here
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {findingsHere.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex min-w-0 items-center gap-2">
                    <SeverityChip severity={f.severity} />
                    <span className="min-w-0 truncate text-xs text-card-foreground">{f.title}</span>
                  </li>
                ))}
                {findingsHere.length > 3 && (
                  <li className="font-mono text-[11px] text-muted-foreground">
                    +{findingsHere.length - 3} more at this state
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Frustration ribbon doubles as the scrubber track */}
      <div className="border-t border-border px-4 py-3">
        <div
          className="flex h-7 gap-px"
          role="group"
          aria-label="Journey timeline — click a step to jump"
        >
          {journey.steps.map((s, i) => {
            const b = frustrationBand(s.frustration);
            const active = i === sIdx;
            return (
              <button
                key={i}
                onClick={() => {
                  setPlaying(false);
                  setSIdx(i);
                }}
                title={taskCheck ? `step ${i + 1} — ${s.action}` : `step ${i + 1} — ${b.label} (${s.frustration})`}
                aria-label={taskCheck ? `Jump to step ${i + 1}, ${s.action}` : `Jump to step ${i + 1}, ${b.label}`}
                aria-current={active}
                className="group relative flex-1 overflow-hidden rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                style={{ backgroundColor: "var(--border)" }}
              >
                {/* Fill height encodes the score; color encodes the band. */}
                <span
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: taskCheck ? "100%" : `${Math.max(s.frustration, 6)}%`, backgroundColor: taskCheck ? "var(--muted-foreground)" : b.token }}
                />
                {active && (
                  <span
                    className="absolute inset-0 border-2"
                    style={{ borderColor: "var(--primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Transport */}
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => go(-1)}
            disabled={sIdx === 0}
            aria-label="Previous step"
            className="rounded-sm border border-border px-2 py-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            ⏮ prev
          </button>
          <button
            onClick={() => {
              if (atEnd) setSIdx(0);
              setPlaying((p) => !p);
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="rounded-sm border px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            {isPlaying ? "⏸ pause" : atEnd ? "↻ replay" : "▶ play"}
          </button>
          <button
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label="Next step"
            className="rounded-sm border border-border px-2 py-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            next ⏭
          </button>
          <span className="hidden text-[10px] text-muted-foreground lg:inline">
            [←/→] step · [Space] play
          </span>
          <button
            onClick={copyMoment}
            aria-label="Copy a link to this moment"
            className="ml-auto rounded-sm border border-border px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            {copied ? "✓ copied" : "⧉ link"}
          </button>
          <span className="text-muted-foreground">
            <span className="tabular-nums text-foreground">{sIdx + 1}</span>
            <span> / {stepCount}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
