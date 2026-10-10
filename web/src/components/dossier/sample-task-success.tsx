"use client";

import { useId, useState } from "react";
import { Meter } from "@/components/forensic/meter";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { frustrationBand } from "@/lib/frustration";
import { SAMPLE_REPLAY_FRAMES, SAMPLE_TARGET } from "@/lib/sample-evidence";

/**
 * Visual Viewport Mockup:
 * Technical state wireframe with a highlighted redline inspection box
 * over the DOM element where axe-core flagged a defect.
 */
function FrameViewport({ index }: { index: number }) {
  if (index === 0) {
    // 01: /login (error)
    return (
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden="true">
        <rect width="320" height="200" fill="var(--background)" />
        {/* Browser URL Bar */}
        <rect x="0" y="0" width="320" height="24" fill="var(--muted)" opacity="0.4" />
        <rect x="12" y="5" width="196" height="14" rx="2" fill="var(--card)" />
        <text x="20" y="15" fill="var(--muted-foreground)" fontSize="9" fontFamily="monospace">
          saucedemo.com/login-error
        </text>
        {/* Login form box */}
        <rect x="70" y="44" width="180" height="136" rx="3" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        {/* Redline alert banner */}
        <rect x="82" y="54" width="156" height="32" rx="2" fill="var(--redline)" opacity="0.12" stroke="var(--redline)" strokeWidth="1.5" />
        <text x="90" y="67" fill="var(--redline)" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
          Epic sadface: Username and
        </text>
        <text x="90" y="79" fill="var(--redline)" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
          password do not match
        </text>
        {/* Form fields */}
        <rect x="86" y="96" width="148" height="16" rx="2" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
        <rect x="86" y="120" width="148" height="16" rx="2" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
        <rect x="86" y="144" width="148" height="24" rx="2" fill="var(--primary)" />
      </svg>
    );
  }

  if (index === 1) {
    // 02: /inventory (defective sort select)
    return (
      <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden="true">
        <rect width="320" height="200" fill="var(--background)" />
        <rect x="0" y="0" width="320" height="24" fill="var(--muted)" opacity="0.4" />
        <rect x="12" y="5" width="196" height="14" rx="2" fill="var(--card)" />
        <text x="20" y="15" fill="var(--muted-foreground)" fontSize="9" fontFamily="monospace">
          saucedemo.com/inventory
        </text>
        {/* Nav header */}
        <rect x="0" y="24" width="320" height="24" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="16" y="40" fill="var(--foreground)" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
          Swag Labs
        </text>
        {/* Redline bounding box around defective select */}
        <rect x="206" y="28" width="100" height="16" rx="2" fill="var(--card)" stroke="var(--redline)" strokeWidth="2" strokeDasharray="3 2" />
        <text x="212" y="40" fill="var(--redline)" fontSize="9" fontWeight="bold" fontFamily="monospace">
          NAME (A TO Z) ▼
        </text>
        {/* Inspection pointer line and tag */}
        <line x1="256" y1="46" x2="256" y2="70" stroke="var(--redline)" strokeWidth="1.5" />
        <rect x="180" y="70" width="130" height="22" rx="2" fill="var(--card)" stroke="var(--redline)" strokeWidth="1" />
        <text x="186" y="84" fill="var(--redline)" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
          ■ select-name: no accessible name
        </text>
        {/* Product grid items */}
        <rect x="16" y="60" width="70" height="90" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <rect x="24" y="68" width="54" height="40" fill="var(--muted)" opacity="0.4" />
        <rect x="24" y="114" width="46" height="6" fill="var(--foreground)" opacity="0.7" />
        <rect x="24" y="130" width="54" height="14" rx="1" fill="var(--primary)" />

        <rect x="96" y="60" width="70" height="90" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <rect x="104" y="68" width="54" height="40" fill="var(--muted)" opacity="0.4" />
        <rect x="104" y="114" width="46" height="6" fill="var(--foreground)" opacity="0.7" />
        <rect x="104" y="130" width="54" height="14" rx="1" fill="var(--primary)" />
      </svg>
    );
  }

  // 03: /checkout (validation error dismiss button)
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="200" fill="var(--background)" />
      <rect x="0" y="0" width="320" height="24" fill="var(--muted)" opacity="0.4" />
      <rect x="12" y="5" width="196" height="14" rx="2" fill="var(--card)" />
      <text x="20" y="15" fill="var(--muted-foreground)" fontSize="9" fontFamily="monospace">
        saucedemo.com/checkout-step-one
      </text>
      {/* Checkout Form */}
      <rect x="40" y="38" width="240" height="146" rx="3" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
      {/* Error alert banner */}
      <rect x="52" y="48" width="216" height="26" rx="2" fill="var(--redline)" opacity="0.12" stroke="var(--redline)" strokeWidth="1" />
      <text x="60" y="64" fill="var(--redline)" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
        Error: Postal Code is required
      </text>
      {/* Defective dismiss button in redline target */}
      <rect x="244" y="52" width="18" height="18" rx="2" fill="var(--card)" stroke="var(--redline)" strokeWidth="2" strokeDasharray="3 2" />
      <path d="M248 56 L258 66 M258 56 L248 66" stroke="var(--redline)" strokeWidth="2" />
      {/* Callout box */}
      <line x1="253" y1="72" x2="253" y2="92" stroke="var(--redline)" strokeWidth="1.5" />
      <rect x="156" y="92" width="116" height="22" rx="2" fill="var(--card)" stroke="var(--redline)" strokeWidth="1" />
      <text x="162" y="106" fill="var(--redline)" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
        ■ button-name: announces only &quot;button&quot;
      </text>
      {/* Form inputs */}
      <rect x="52" y="82" width="90" height="14" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
      <rect x="52" y="102" width="90" height="14" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
      <rect x="52" y="122" width="90" height="14" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
      <rect x="52" y="148" width="80" height="20" rx="1" fill="var(--border)" />
      <rect x="188" y="148" width="80" height="20" rx="1" fill="var(--primary)" />
    </svg>
  );
}

/**
 * Persona task-success panel: a scrubbable replay of an AI browser agent walking the
 * SauceDemo probe. Explicitly labeled AI opinion, never a compliance verdict: the axe
 * findings inside each frame are deterministic, while "did the persona reach its goal"
 * is the model's read of the final page, not a WCAG check.
 */
export function SampleTaskSuccess({ className = "" }: { className?: string }) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const [index, setIndex] = useState(0);
  const frame = SAMPLE_REPLAY_FRAMES[index]!;
  const reachedGoal = index === SAMPLE_REPLAY_FRAMES.length - 1;
  const band = frustrationBand(frame.frustration);

  return (
    <div className={`sheet overflow-hidden ${className}`} role="region" aria-label="Persona task-success replay, sample">
      {/* Dossier Case Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-card p-4 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="label-mono">Persona replay · {SAMPLE_TARGET.host}</p>
          <span className="font-mono text-xs text-muted-foreground">· step {index + 1} of {SAMPLE_REPLAY_FRAMES.length}</span>
        </div>
        <span className="redline-note uppercase tracking-[0.1em]">Opinion · AI</span>
      </div>

      {/* Split Interactive Viewport & Narration Panel */}
      <div id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${frame.id}`} className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Left: Visual Viewport with Element Target Callout */}
        <div className="relative border-b border-border bg-background p-3 sm:p-5 md:border-b-0 md:border-r">
          <div className="overflow-hidden rounded-xs border border-border shadow-xs">
            <FrameViewport index={index} />
          </div>
          {frame.target && (
            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-[var(--redline)] font-bold">Element inspection:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{frame.target}</code>
            </div>
          )}
        </div>

        {/* Right: Narration & Diagnostic Evidence */}
        <div className="flex flex-col justify-between p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="label-mono">State: {frame.state}</span>
                <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Action: {frame.action}
                </span>
              </div>
              <p className="mt-3 font-serif text-[1.125rem] italic leading-relaxed text-foreground">
                &ldquo;{frame.thought}&rdquo;
              </p>
            </div>

            {/* Inferred Frustration Gauge */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground uppercase tracking-wider text-xs">
                  Inferred friction
                </span>
                <span className="font-bold tabular-nums" style={{ color: band.token }}>
                  {frame.frustration} / 100 ({band.label})
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-xs bg-muted">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${frame.frustration}%`, backgroundColor: band.token }}
                />
              </div>
            </div>

            {/* Deterministic axe finding at this state */}
            {frame.finding ? (
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <SeverityChip severity={frame.finding.severity} ruleId={frame.finding.wcag} />
                  <span className="font-mono text-xs text-muted-foreground">{frame.finding.ruleId}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed font-medium text-foreground">
                  {frame.finding.title}
                </p>
              </div>
            ) : (
              <div className="border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                No axe-core findings logged at this state.
              </div>
            )}
          </div>

          <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">
            Illustrative walk from {SAMPLE_TARGET.source}. The task success opinion is separate from deterministic WCAG findings.
          </p>
        </div>
      </div>

      {/* Scrubber Navigation Ribbon */}
      <div className="border-t border-border bg-card p-3 sm:px-6">
        <div
          className="grid grid-cols-3 gap-2"
          role="tablist"
          aria-label="Replay steps"
        >
          {SAMPLE_REPLAY_FRAMES.map((f, i) => {
            const active = i === index;
            const b = frustrationBand(f.frustration);
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
                className={`relative flex min-w-0 flex-col rounded-xs border p-2 text-left sm:p-2.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
                  active
                    ? "border-[var(--primary)] bg-muted/60 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
                  <span className="font-mono text-xs font-bold tabular-nums">Step {f.step}</span>
                  <span className="font-mono text-xs" style={{ color: b.token }}>
                    {b.label}
                  </span>
                </div>
                <span className="mt-1 min-w-0 break-words font-mono text-xs font-medium text-foreground sm:text-xs">
                  {f.state}
                </span>
              </button>
            );
          })}
        </div>

        {/* Transport controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-2.5 text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(SAMPLE_REPLAY_FRAMES.length - 1, i + 1))}
              disabled={reachedGoal}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Next
            </button>
          </div>
          <Meter
            value={index + 1}
            total={SAMPLE_REPLAY_FRAMES.length}
            label={reachedGoal ? "blocked at checkout" : "in progress"}
            unit="steps"
            tone={reachedGoal ? "critical" : "serious"}
          />
        </div>
      </div>
    </div>
  );
}
