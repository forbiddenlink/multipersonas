"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { frustrationBand } from "@/lib/frustration";
import { formatLocation } from "@/lib/format-location";
import { isGiveUp, stuckStepIndexes, type OutcomeBadge } from "@/lib/persona-outcomes";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { severityMeta } from "@/components/forensic/severity";
import type { PersonaJourney } from "@/lib/journey";

export interface RecorderPersona {
  personaId: string;
  name: string;
  role: string;
  /** Viewport, input and connection, from describeDevice(). Empty for custom personas. */
  device: string;
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

/** Short row label: the path on the page's host, with the full location kept for the tooltip. */
function pathLabel(pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return formatLocation(pageUrl) ?? pageUrl;
  }
}

/** Index of the tick under a shared cursor, proportional through a track of `len` ticks. */
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
    const params = new URLSearchParams(window.location.search);
    if (focusedPersona?.journey) {
      params.set("persona", focusedPersona.personaId);
      params.set("step", String(focusedStepIdx));
    } else if (params.has("persona") || params.has("step")) {
      // Focus moved to the axe lane: a stale persona moment must not stay in the link.
      params.delete("persona");
      params.delete("step");
    } else {
      return;
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [focusedPersona, focusedStepIdx]);

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

  // Stuck flags come from the same rule as the Stuck points list (rankStuckPoints).
  const stuckByPersona = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const p of playable) m.set(p.personaId, stuckStepIndexes(p.journey!));
    return m;
  }, [playable]);

  const focusedLen =
    focus.lane === "persona"
      ? (focusedPersona?.journey?.steps.length ?? 0)
      : (axePages[focus.row]?.items.length ?? 0);
  const focusedIdx = tickAt(focusedLen, cursor, max);

  // One short, always-mounted live region. The slider announces itself through its own
  // aria-valuetext, so only tick and prev/next moves write here.
  const [announce, setAnnounce] = useState("");
  const describeTick = (f: Focus, i: number): string => {
    if (f.lane === "persona") {
      const p = personas[f.row];
      const steps = p?.journey?.steps ?? [];
      const s = steps[i];
      if (!p || !s) return "";
      const mark = isGiveUp(s) ? ", gave up" : stuckByPersona.get(p.personaId)?.has(i) ? ", stuck point" : "";
      return `${p.name}, step ${i + 1} of ${steps.length}${mark}, ${s.action}`;
    }
    const page = axePages[f.row];
    const item = page?.items[i];
    if (!page || !item) return "";
    return `${severityMeta(item.severity).label}, ${item.ruleId ?? item.title}, finding ${i + 1} of ${page.items.length} on ${pathLabel(page.pageUrl)}`;
  };

  const select = (f: Focus, len: number, i: number) => {
    setFocus(f);
    setCursor(cursorFor(len, i, max));
    setAnnounce(describeTick(f, i));
  };

  // Prev and next walk the focused track's own ticks, not the longest track's.
  const stepBy = (d: number) => {
    if (focusedLen <= 0) return;
    select(focus, focusedLen, Math.min(focusedLen - 1, Math.max(0, focusedIdx + d)));
  };

  // Roving tabindex: one tab stop per track. Arrows, Home and End move within it.
  const onTickKey = (e: KeyboardEvent<HTMLButtonElement>, f: Focus, len: number, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = Math.min(len - 1, i + 1);
    else if (e.key === "ArrowLeft") n = Math.max(0, i - 1);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = len - 1;
    else return;
    e.preventDefault();
    select(f, len, n);
    (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
  };

  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyMoment = useCallback(async () => {
    // The URL carries ?persona&step (kept in sync above). The link still needs the owner's
    // sign-in to open, so nothing private leaks.
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
            {personas.length > 0 ? <span className="text-sm text-muted-foreground">{headline}</span> : null}
          </div>
        </div>
        {personas.length === 0 ? (
          <p className="px-3 pb-3 pt-2 text-sm text-muted-foreground sm:px-4">This run had no personas.</p>
        ) : null}
        <ul className="divide-y divide-border px-3 pb-3 sm:px-4">
          {personas.map((p, row) => {
            const steps = p.journey?.steps ?? [];
            const sel = focus.lane === "persona" && focus.row === row;
            const idx = tickAt(steps.length, cursor, max);
            const flags = stuckByPersona.get(p.personaId);
            const f: Focus = { lane: "persona", row };
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
                  {p.role ? <p className="break-words text-[13px] leading-snug text-muted-foreground">{p.role}</p> : null}
                  {p.device ? (
                    <p className="break-words font-mono text-[12px] leading-snug text-muted-foreground">{p.device}</p>
                  ) : null}
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
                  <div role="group" aria-label={`${p.name} steps`} className="min-w-0 overflow-x-auto">
                    <div className="flex gap-px" style={{ minWidth: `${steps.length * 25}px` }}>
                      {steps.map((s, i) => {
                        const b = frustrationBand(s.frustration);
                        const giveUp = isGiveUp(s);
                        const flag = Boolean(flags?.has(i));
                        const active = sel && i === idx;
                        const fill = Math.max(18, 18 + s.frustration * 0.82);
                        return (
                          <button
                            key={i}
                            type="button"
                            tabIndex={i === idx ? 0 : -1}
                            onClick={() => select(f, steps.length, i)}
                            onKeyDown={(e) => onTickKey(e, f, steps.length, i)}
                            aria-current={active ? "step" : undefined}
                            aria-label={`${p.name}, step ${i + 1}${giveUp ? ", gave up" : flag ? ", stuck point" : ""}${taskCheck ? "" : `, ${b.label}`}`}
                            title={taskCheck ? `step ${i + 1}: ${s.action}` : `step ${i + 1}: ${b.label} (${s.frustration})`}
                            className={`flex min-w-0 flex-1 flex-col items-stretch ${TICK_FOCUS}`}
                          >
                            <span aria-hidden="true" className="h-4 text-center text-[13px] leading-4 text-[var(--severity-critical)]">
                              {flag ? "⚑" : ""}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`relative block h-8 overflow-hidden rounded-[2px] border border-foreground/45 bg-background ${
                                active ? "outline-2 outline-offset-1 outline-[var(--foreground)]" : ""
                              }`}
                            >
                              <span
                                className="absolute inset-x-0 bottom-0 block"
                                style={{
                                  height: taskCheck ? "100%" : `${fill}%`,
                                  backgroundColor: taskCheck
                                    ? "color-mix(in oklch, var(--foreground) 35%, transparent)"
                                    : b.band === "calm"
                                      ? "color-mix(in oklch, var(--foreground) 45%, transparent)"
                                      : b.token,
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
                <h3 className="display text-xl leading-tight">axe-core findings by page</h3>
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
                const f: Focus = { lane: "axe", row };
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
                    <div role="group" aria-label={`Findings on ${formatLocation(page.pageUrl) ?? page.pageUrl}`} className="min-w-0 overflow-x-auto">
                      <div className="flex gap-px" style={{ minWidth: `${page.items.length * 25}px` }}>
                        {page.items.map((item, i) => {
                          const meta = severityMeta(item.severity);
                          const active = sel && i === idx;
                          const big = meta.glyph === "■" || meta.glyph === "●";
                          return (
                            <button
                              key={item.id}
                              type="button"
                              tabIndex={i === idx ? 0 : -1}
                              onClick={() => select(f, page.items.length, i)}
                              onKeyDown={(e) => onTickKey(e, f, page.items.length, i)}
                              aria-current={active ? "step" : undefined}
                              aria-label={`${meta.label}, ${item.ruleId ?? item.title}`}
                              title={`${meta.label}: ${item.ruleId ?? item.title}`}
                              className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-[2px] border leading-none ${TICK_FOCUS} ${
                                active ? "outline-2 outline-offset-1 outline-[var(--foreground)]" : ""
                              }`}
                              style={{
                                color: meta.token,
                                borderColor: `color-mix(in oklch, ${meta.token} 55%, transparent)`,
                                backgroundColor: `color-mix(in oklch, ${meta.token} 12%, transparent)`,
                              }}
                            >
                              <span aria-hidden="true" className={big ? "text-[22px]" : "text-[14px]"}>
                                {meta.glyph}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {axePages.length === 0 && axeNotShown > 0 ? (
          <p className="border-t border-border px-3 pt-3 text-[13px] text-muted-foreground sm:px-4">
            axe-core recorded no findings with a page location.
          </p>
        ) : null}
        {axeNotShown > 0 ? (
          <p className="px-3 pb-3 pt-1 text-[13px] text-muted-foreground sm:px-4">
            {axeNotShown} more {axeNotShown === 1 ? "finding is" : "findings are"} in the issues table below.
          </p>
        ) : null}

        {/* Single scrubber: steps the focused track, not the longest one. */}
        {hasAnyTrack ? (
          <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4">
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Previous step"
              disabled={focusedIdx <= 0}
              className={`h-9 w-9 shrink-0 rounded-sm border border-border text-base disabled:opacity-40 ${TICK_FOCUS}`}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, focusedLen - 1)}
              step={1}
              value={focusedIdx}
              onChange={(e) => setCursor(cursorFor(focusedLen, Number(e.target.value), max))}
              aria-label="Scrub the selected track"
              aria-valuetext={readout}
              disabled={focusedLen <= 1}
              className="h-9 min-w-0 flex-1 accent-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Next step"
              disabled={focusedIdx >= focusedLen - 1}
              className={`h-9 w-9 shrink-0 rounded-sm border border-border text-base disabled:opacity-40 ${TICK_FOCUS}`}
            >
              <span aria-hidden="true">›</span>
            </button>
            <span className="hidden shrink-0 text-[13px] tabular-nums text-muted-foreground sm:inline">{readout}</span>
            {focusedPersona?.journey ? (
              <button
                type="button"
                onClick={copyMoment}
                aria-label="Copy a link to this moment"
                className={`ml-auto h-9 shrink-0 rounded-sm border border-border px-3 text-[13px] text-muted-foreground hover:text-foreground ${TICK_FOCUS}`}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            ) : null}
          </div>
        ) : null}
        {copyError ? (
          <p role="alert" className="px-3 py-2 text-sm text-destructive sm:px-4">
            {copyError}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="recorder-live">
          {announce}
        </p>
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
                  {isGiveUp(focusedStep) ? " (gave up)" : ""}
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
                    {!isGiveUp(focusedStep) && stuckByPersona.get(focusedPersona.personaId)?.has(focusedStepIdx) ? (
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
