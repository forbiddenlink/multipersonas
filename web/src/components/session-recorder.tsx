"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { frustrationBand } from "@/lib/frustration";
import { formatLocation } from "@/lib/format-location";
import { isGiveUp, STUCK_FRUSTRATION, type OutcomeBadge } from "@/lib/persona-outcomes";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { severityMeta } from "@/components/forensic/severity";
import type { PersonaJourney } from "@/lib/journey";

export interface RecorderPersona {
  personaId: string;
  name: string;
  role: string;
  badge: OutcomeBadge;
  journey: PersonaJourney | null;
  /** Persona-authored finding titles, shown only when no step-by-step journey was recorded. */
  notes: string[];
}

export interface RecorderAxeItem {
  id: string;
  severity: string;
  ruleId: string | null;
  title: string;
  why: string | null;
  fix: string | null;
  pageUrl: string;
}

export interface SessionRecorderProps {
  personas: RecorderPersona[];
  /** Run-level outcome line, from outcomeHeadline(). */
  headline: string;
  /** axe findings that carry a page url, one lane row per page, in first-seen order. */
  axePages: { pageUrl: string; items: RecorderAxeItem[] }[];
  /** axe findings with no page url, or on pages beyond the lane's row cap. */
  axeNotShown: number;
  initialPersona?: string;
  initialStep?: number;
  taskCheck: boolean;
}

type Focus = { lane: "persona"; row: number } | { lane: "axe"; row: number };

/** Index of the tick under a shared cursor, proportional through a track of `len` ticks. */
/** Short row label: the path on the page's host, with the full location kept for the tooltip. */
function pathLabel(pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return formatLocation(pageUrl) ?? pageUrl;
  }
}

function tickAt(len: number, cursor: number, max: number): number {
  if (len <= 1 || max <= 0) return 0;
  return Math.min(len - 1, Math.max(0, Math.round((cursor / max) * (len - 1))));
}

/** Cursor value that lands on tick `i` of a `len`-tick track. */
function cursorFor(len: number, i: number, max: number): number {
  if (len <= 1 || max <= 0) return 0;
  return Math.round((i / (len - 1)) * max);
}

const CLAMP_CHARS = 280;

function Monologue({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_CHARS;
  return (
    <div>
      <p className={`font-serif text-base italic leading-relaxed ${long && !open ? "line-clamp-5" : ""}`}>
        &ldquo;{text}&rdquo;
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1 text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

const TICK_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ring)]";

export function SessionRecorder({
  personas,
  headline,
  axePages,
  axeNotShown,
  initialPersona,
  initialStep = 0,
  taskCheck,
}: SessionRecorderProps) {
  const playable = useMemo(() => personas.filter((p) => p.journey && p.journey.steps.length > 0), [personas]);
  const longest = Math.max(
    1,
    ...playable.map((p) => p.journey!.steps.length),
    ...axePages.map((p) => p.items.length),
  );
  const max = longest - 1;

  const isPlayable = (p: RecorderPersona | undefined) => Boolean(p?.journey && p.journey.steps.length > 0);
  const requested = personas.findIndex((p) => p.personaId === initialPersona && isPlayable(p));
  const startRow = requested >= 0 ? requested : personas.findIndex((p) => isPlayable(p));

  const [focus, setFocus] = useState<Focus>(() =>
    startRow >= 0 ? { lane: "persona", row: startRow } : { lane: "axe", row: 0 },
  );
  const [cursor, setCursor] = useState(() => {
    const p = personas[startRow];
    const len = p?.journey?.steps.length ?? 0;
    if (len > 0) return cursorFor(len, Math.min(Math.max(initialStep, 0), len - 1), max);
    return 0;
  });

  // Keep the current persona moment deep-linkable, as the old replay did.
  const focusedPersona = focus.lane === "persona" ? personas[focus.row] : undefined;
  const focusedStepIdx =
    focusedPersona?.journey ? tickAt(focusedPersona.journey.steps.length, cursor, max) : 0;
  useEffect(() => {
    if (!focusedPersona?.journey) return;
    const params = new URLSearchParams(window.location.search);
    params.set("persona", focusedPersona.personaId);
    params.set("step", String(focusedStepIdx));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [focusedPersona, focusedStepIdx]);

  const stepBy = useCallback(
    (d: number) => setCursor((c) => Math.min(max, Math.max(0, c + d))),
    [max],
  );

  const reachedBy = useCallback(
    (pageUrl: string) =>
      playable
        .filter((p) => p.journey!.steps.some((s) => s.pageUrl === pageUrl))
        .map((p) => p.name),
    [playable],
  );

  const axeByUrl = useMemo(() => {
    const m = new Map<string, RecorderAxeItem[]>();
    for (const page of axePages) m.set(page.pageUrl, page.items);
    return m;
  }, [axePages]);

  const focusedAxe =
    focus.lane === "axe" && axePages[focus.row]
      ? axePages[focus.row]!.items[tickAt(axePages[focus.row]!.items.length, cursor, max)]
      : undefined;
  const focusedStep = focusedPersona?.journey?.steps[focusedStepIdx];

  const readout =
    focusedPersona?.journey
      ? `${focusedPersona.name}, step ${focusedStepIdx + 1} of ${focusedPersona.journey.steps.length}`
      : focusedAxe && focus.lane === "axe"
        ? `Finding ${tickAt(axePages[focus.row]!.items.length, cursor, max) + 1} of ${axePages[focus.row]!.items.length}`
        : "No recorded steps";

  const hasAnyTrack = playable.length > 0 || axePages.length > 0;

  return (
    <section aria-labelledby="recorder-heading" className="space-y-4">
      <h2 id="recorder-heading" className="sr-only">
        Session recording
      </h2>

      <div className="border-y-2 border-foreground">
        {/* Lane A */}
        <div className="px-3 pt-3 sm:px-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="display text-xl leading-tight">Persona sessions</h3>
            <span className="text-[13px] font-semibold text-[var(--redline)]">AI opinion</span>
            <span className="text-sm text-muted-foreground">{headline}</span>
          </div>
        </div>
        <ul className="divide-y divide-border px-3 pb-3 sm:px-4">
          {personas.map((p, row) => {
            const steps = p.journey?.steps ?? [];
            const sel = focus.lane === "persona" && focus.row === row;
            const idx = tickAt(steps.length, cursor, max);
            return (
              <li
                key={p.personaId}
                className={`grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 py-2 sm:grid-cols-[11rem_minmax(0,1fr)] ${
                  sel ? "bg-muted/60" : ""
                }`}
              >
                <div className="min-w-0 px-1">
                  <p className="truncate text-sm font-medium" title={p.name}>
                    {p.name}
                  </p>
                  <p>
                    <span
                      className={`inline-flex items-center gap-1 text-[13px] font-semibold ${
                        p.badge === "blocked"
                          ? "text-[var(--severity-critical)]"
                          : p.badge === "not verified"
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      <span aria-hidden="true">{p.badge === "blocked" ? "⚑" : p.badge === "not verified" ? "?" : "✓"}</span>
                      {p.badge}
                    </span>
                  </p>
                </div>
                {steps.length > 0 ? (
                  <div
                    role="group"
                    aria-label={`${p.name} steps`}
                    className="min-w-0 overflow-x-auto"
                    tabIndex={-1}
                  >
                    <div className="flex gap-px" style={{ minWidth: `${steps.length * 20}px` }}>
                      {steps.map((s, i) => {
                        const b = frustrationBand(s.frustration);
                        const flag = (s.action !== "finish" && s.frustration >= STUCK_FRUSTRATION) || isGiveUp(s);
                        const active = sel && i === idx;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setFocus({ lane: "persona", row });
                              setCursor(cursorFor(steps.length, i, max));
                            }}
                            aria-current={active ? "step" : undefined}
                            aria-label={`${p.name}, step ${i + 1}${flag ? ", stuck point" : ""}, ${b.label}`}
                            title={taskCheck ? `step ${i + 1}: ${s.action}` : `step ${i + 1}: ${b.label} (${s.frustration})`}
                            className={`flex min-w-0 flex-1 flex-col items-stretch ${TICK_FOCUS}`}
                          >
                            <span aria-hidden="true" className="h-4 text-center text-[13px] leading-4 text-[var(--severity-critical)]">
                              {flag ? "⚑" : ""}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`relative block h-7 overflow-hidden rounded-[2px] border border-border bg-muted ${
                                active ? "outline-2 outline-offset-1 outline-[var(--foreground)]" : ""
                              }`}
                            >
                              <span
                                className="absolute inset-x-0 bottom-0 block"
                                style={{
                                  height: taskCheck ? "100%" : `${Math.max(s.frustration, 8)}%`,
                                  backgroundColor: taskCheck ? "var(--muted-foreground)" : b.token,
                                }}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No step-by-step journey was recorded for this persona.
                    {p.notes.length > 0 ? ` Notes: ${p.notes.slice(0, 2).join("; ")}.` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {/* Lane B */}
        {axePages.length > 0 ? (
          <div className="border-t border-border">
            <div className="px-3 pt-3 sm:px-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="display text-xl leading-tight">Accessibility scan (axe-core)</h3>
                <span className="text-[13px] font-semibold">Deterministic</span>
                <span className="text-sm text-muted-foreground">
                  Ticks are findings, coloured and shaped by impact.
                </span>
              </div>
            </div>
            <ul className="divide-y divide-border px-3 pb-3 sm:px-4">
              {axePages.map((page, row) => {
                const sel = focus.lane === "axe" && focus.row === row;
                const idx = tickAt(page.items.length, cursor, max);
                const crit = page.items.filter((f) => f.severity === "critical").length;
                return (
                  <li
                    key={page.pageUrl}
                    className={`grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 py-2 sm:grid-cols-[11rem_minmax(0,1fr)] ${
                      sel ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="min-w-0 px-1">
                      <p className="truncate font-mono text-[13px]" title={formatLocation(page.pageUrl) ?? page.pageUrl}>
                        {pathLabel(page.pageUrl)}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {page.items.length} {page.items.length === 1 ? "issue" : "issues"}
                        {crit > 0 ? `, ${crit} critical` : ""}
                      </p>
                    </div>
                    <div role="group" aria-label={`Findings on ${formatLocation(page.pageUrl) ?? page.pageUrl}`} className="min-w-0 overflow-x-auto" tabIndex={-1}>
                      <div className="flex gap-px" style={{ minWidth: `${page.items.length * 20}px` }}>
                        {page.items.map((f, i) => {
                          const meta = severityMeta(f.severity);
                          const active = sel && i === idx;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setFocus({ lane: "axe", row });
                                setCursor(cursorFor(page.items.length, i, max));
                              }}
                              aria-current={active ? "step" : undefined}
                              aria-label={`${meta.label}, ${f.ruleId ?? f.title}`}
                              title={`${meta.label}: ${f.ruleId ?? f.title}`}
                              className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-[2px] border text-[13px] leading-none ${TICK_FOCUS} ${
                                active ? "outline-2 outline-offset-1 outline-[var(--foreground)]" : ""
                              }`}
                              style={{
                                color: meta.token,
                                borderColor: `color-mix(in oklch, ${meta.token} 55%, transparent)`,
                                backgroundColor: `color-mix(in oklch, ${meta.token} 12%, transparent)`,
                              }}
                            >
                              <span aria-hidden="true">{meta.glyph}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {axeNotShown > 0 ? (
              <p className="px-3 pb-3 text-[13px] text-muted-foreground sm:px-4">
                {axeNotShown} more {axeNotShown === 1 ? "finding is" : "findings are"} in the issues table below.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Single scrubber */}
        {hasAnyTrack ? (
          <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4">
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Previous step"
              disabled={cursor <= 0}
              className={`h-9 w-9 shrink-0 rounded-sm border border-border text-base disabled:opacity-40 ${TICK_FOCUS}`}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={cursor}
              onChange={(e) => setCursor(Number(e.target.value))}
              aria-label="Scrub both lanes"
              aria-valuetext={readout}
              disabled={max === 0}
              className="h-9 min-w-0 flex-1 accent-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Next step"
              disabled={cursor >= max}
              className={`h-9 w-9 shrink-0 rounded-sm border border-border text-base disabled:opacity-40 ${TICK_FOCUS}`}
            >
              <span aria-hidden="true">›</span>
            </button>
            <span className="hidden shrink-0 text-[13px] tabular-nums text-muted-foreground sm:inline" aria-live="polite">
              {readout}
            </span>
          </div>
        ) : null}
      </div>

      {/* Detail at the cursor */}
      {hasAnyTrack ? (
        <div aria-label="At the cursor" role="region" className="space-y-1">
          <p className="text-sm text-muted-foreground sm:hidden" aria-hidden="true">
            {readout}
          </p>
          {focusedStep && focusedPersona ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="truncate pb-1 font-mono text-[13px] text-muted-foreground">
                  {formatLocation(focusedStep.pageUrl) ?? "no location recorded"}
                </p>
                <div className="relative aspect-[16/10] w-full overflow-hidden border border-border bg-muted">
                  {focusedStep.screenshotUrl ? (
                    // Signed, short-lived private URL: a plain img avoids next/image remote config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={focusedStep.screenshotUrl}
                      alt={`${focusedPersona.name}, step ${focusedStepIdx + 1}: ${focusedStep.action}`}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  ) : (
                    <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      No frame was captured for this step.
                    </p>
                  )}
                </div>
              </div>
              <div className="min-w-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{focusedPersona.name}</span>
                  {`, step ${focusedStepIdx + 1}: ${focusedStep.action}`}
                  {focusedStep.detail ? <span className="break-words">{`, ${focusedStep.detail}`}</span> : null}
                </p>
                {focusedStep.reasoning ? (
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--redline)]">AI opinion</p>
                    <Monologue key={`${focusedPersona.personaId}-${focusedStepIdx}`} text={focusedStep.reasoning} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No narration was recorded for this step.</p>
                )}
                {!taskCheck ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Task effort </span>
                    <span className="font-mono tabular-nums" style={{ color: frustrationBand(focusedStep.frustration).token }}>
                      {focusedStep.frustration}
                    </span>{" "}
                    <span style={{ color: frustrationBand(focusedStep.frustration).token }}>
                      {frustrationBand(focusedStep.frustration).label}
                    </span>
                    {focusedStep.action !== "finish" && focusedStep.frustration >= STUCK_FRUSTRATION ? (
                      <span className="text-[var(--severity-critical)]"> (stuck point)</span>
                    ) : null}
                  </p>
                ) : null}
                {(() => {
                  const here = (focusedStep.pageUrl && axeByUrl.get(focusedStep.pageUrl)) || [];
                  if (here.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[13px] text-muted-foreground">axe-core findings on this page</p>
                      <ul className="mt-1 space-y-1">
                        {here.slice(0, 3).map((f) => (
                          <li key={f.id} className="flex min-w-0 items-center gap-2">
                            <SeverityChip severity={f.severity} />
                            <span className="min-w-0 truncate text-sm">{f.title}</span>
                          </li>
                        ))}
                        {here.length > 3 ? (
                          <li className="text-[13px] text-muted-foreground">+{here.length - 3} more on this page</li>
                        ) : null}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : focusedAxe ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={focusedAxe.severity} />
                  {focusedAxe.ruleId ? <code className="font-mono text-sm">{focusedAxe.ruleId}</code> : null}
                </div>
                <p className="text-base font-medium">{focusedAxe.title}</p>
                {focusedAxe.why ? <p className="max-w-prose text-sm text-muted-foreground">{focusedAxe.why}</p> : null}
                {focusedAxe.fix ? <p className="max-w-prose text-sm">{focusedAxe.fix}</p> : null}
              </div>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="break-all font-mono text-[13px] text-muted-foreground">
                  {formatLocation(focusedAxe.pageUrl)}
                </p>
                {(() => {
                  const names = reachedBy(focusedAxe.pageUrl);
                  return names.length > 0 ? (
                    <p>
                      <span className="text-muted-foreground">Personas that reached this page: </span>
                      {names.join(", ")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No recorded persona step landed on this page.</p>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a tick to see the step or finding at that point.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
