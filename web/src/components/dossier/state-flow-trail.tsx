"use client";

import { useState } from "react";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { SAUCEDEMO_TRAIL } from "@/lib/probe-ledger";

/**
 * State Wireframe Schematics:
 * Technical mini-viewport blueprints illustrating the actual UI state reached
 * behind the login, visually flagging the specific element where axe-core
 * flagged a WCAG violation in redline.
 */
function StateWireframe({ index }: { index: number }) {
  switch (index) {
    case 0:
      // State 01: / (Public login) — Clean pass
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          {/* Header bar */}
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="12" y="5" width="40" height="6" rx="1" fill="var(--foreground)" opacity="0.4" />
          {/* Centered Login Card */}
          <rect x="50" y="26" width="100" height="78" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          {/* Title */}
          <rect x="62" y="34" width="45" height="5" rx="1" fill="var(--foreground)" opacity="0.7" />
          {/* Input 1 */}
          <rect x="62" y="44" width="76" height="10" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          {/* Input 2 */}
          <rect x="62" y="58" width="76" height="10" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          {/* Submit button */}
          <rect x="62" y="74" width="76" height="14" rx="1" fill="var(--primary)" />
          <rect x="84" y="79" width="32" height="4" rx="1" fill="var(--primary-foreground)" />
        </svg>
      );
    case 1:
      // State 02: /login (error) — In-page error banner
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="12" y="5" width="40" height="6" rx="1" fill="var(--foreground)" opacity="0.4" />
          <rect x="50" y="24" width="100" height="82" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          {/* Redline alert banner */}
          <rect x="58" y="32" width="84" height="12" rx="1" fill="var(--redline)" opacity="0.15" stroke="var(--redline)" strokeWidth="1" />
          <rect x="64" y="36" width="55" height="4" rx="1" fill="var(--redline)" />
          <rect x="62" y="50" width="76" height="10" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="62" y="64" width="76" height="10" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="62" y="80" width="76" height="14" rx="1" fill="var(--primary)" />
        </svg>
      );
    case 2:
      // State 03: /inventory — Catalog with defective unlabelled select in redline
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="12" y="5" width="30" height="6" rx="1" fill="var(--foreground)" opacity="0.4" />
          {/* Subheader bar with sort select */}
          <rect x="12" y="22" width="48" height="6" rx="1" fill="var(--foreground)" opacity="0.6" />
          {/* Defective sort select with redline highlight */}
          <rect x="136" y="20" width="52" height="11" rx="1" fill="var(--card)" stroke="var(--redline)" strokeWidth="1.5" />
          <rect x="141" y="24" width="32" height="3" rx="0.5" fill="var(--redline)" />
          <path d="M179 24 L183 24 L181 27 Z" fill="var(--redline)" />
          {/* Product grid */}
          <rect x="12" y="37" width="54" height="74" rx="1" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="18" y="43" width="42" height="28" fill="var(--muted)" opacity="0.5" />
          <rect x="18" y="76" width="36" height="4" fill="var(--foreground)" opacity="0.7" />
          <rect x="18" y="84" width="24" height="4" fill="var(--muted-foreground)" />
          <rect x="18" y="93" width="42" height="10" rx="1" fill="var(--primary)" />

          <rect x="73" y="37" width="54" height="74" rx="1" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="79" y="43" width="42" height="28" fill="var(--muted)" opacity="0.5" />
          <rect x="79" y="76" width="36" height="4" fill="var(--foreground)" opacity="0.7" />
          <rect x="79" y="84" width="24" height="4" fill="var(--muted-foreground)" />
          <rect x="79" y="93" width="42" height="10" rx="1" fill="var(--primary)" />

          <rect x="134" y="37" width="54" height="74" rx="1" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="140" y="43" width="42" height="28" fill="var(--muted)" opacity="0.5" />
          <rect x="140" y="76" width="36" height="4" fill="var(--foreground)" opacity="0.7" />
          <rect x="140" y="84" width="24" height="4" fill="var(--muted-foreground)" />
          <rect x="140" y="93" width="42" height="10" rx="1" fill="var(--primary)" />
        </svg>
      );
    case 3:
      // State 04: /cart — Table of cart items
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="12" y="24" width="60" height="7" rx="1" fill="var(--foreground)" opacity="0.8" />
          {/* Cart item row 1 */}
          <rect x="12" y="38" width="176" height="30" rx="1" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="20" y="44" width="18" height="18" fill="var(--muted)" opacity="0.5" />
          <rect x="46" y="46" width="65" height="5" fill="var(--foreground)" opacity="0.7" />
          <rect x="46" y="55" width="35" height="4" fill="var(--muted-foreground)" />
          <rect x="150" y="48" width="28" height="10" rx="1" fill="var(--border)" />
          {/* Cart actions */}
          <rect x="12" y="84" width="64" height="16" rx="1" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="124" y="84" width="64" height="16" rx="1" fill="var(--primary)" />
        </svg>
      );
    case 4:
      // State 05: /checkout-step-one — Address input forms
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="12" y="23" width="70" height="6" rx="1" fill="var(--foreground)" opacity="0.7" />
          <rect x="36" y="36" width="128" height="72" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <rect x="48" y="44" width="104" height="9" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="48" y="57" width="104" height="9" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="48" y="70" width="104" height="9" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="48" y="86" width="48" height="13" rx="1" fill="var(--border)" />
          <rect x="104" y="86" width="48" height="13" rx="1" fill="var(--primary)" />
        </svg>
      );
    case 5:
    default:
      // State 06: /checkout (validation) — Modal error with defective button
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
          <rect width="200" height="120" fill="var(--background)" />
          <rect x="0" y="0" width="200" height="16" fill="var(--muted)" opacity="0.6" />
          <rect x="36" y="24" width="128" height="84" rx="2" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          {/* Validation error ribbon with highlighted unlabelled close button */}
          <rect x="44" y="32" width="112" height="18" rx="1" fill="var(--redline)" opacity="0.12" stroke="var(--redline)" strokeWidth="1" />
          <rect x="52" y="38" width="72" height="5" rx="1" fill="var(--redline)" />
          {/* Defective dismiss button */}
          <rect x="138" y="35" width="12" height="12" rx="1" fill="var(--card)" stroke="var(--redline)" strokeWidth="1.5" />
          <path d="M141 38 L147 44 M147 38 L141 44" stroke="var(--redline)" strokeWidth="1.5" />
          {/* Disabled fields */}
          <rect x="48" y="58" width="104" height="8" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="48" y="70" width="104" height="8" rx="1" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
          <rect x="104" y="86" width="48" height="13" rx="1" fill="var(--primary)" />
        </svg>
      );
  }
}

export function StateFlowTrail() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="mt-8 space-y-6 sm:mt-12">
      {/* Boundary indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="label-mono text-xs">Full-flow crawl map: 6 states captured</span>
        </div>
        <div className="hidden flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 border border-border bg-card" />
            Public entry (1 state)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 border border-[var(--primary)] bg-[var(--primary)]" />
            Behind login (5 states)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--redline)] font-medium">
            <span className="inline-block h-2 w-2 bg-[var(--redline)]" />
            Defect state (3 critical)
          </span>
        </div>
      </div>

      {/* Connected Trail Grid */}
      {/* Phone: a compact ledger, one row per state. The full cards return at sm and up. */}
      <ol
        className="border-t border-border sm:hidden"
        aria-label="SauceDemo test store state progression"
      >
        {SAUCEDEMO_TRAIL.map((s, i) => (
          <li
            key={s.path}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-3"
          >
            <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{s.label}</span>
              <span className="mt-0.5 block break-words font-mono text-xs text-muted-foreground">
                {s.publicUrl ? "Public" : "Session only"} · {s.path}
              </span>
            </span>
            {s.findings > 0 ? (
              <SeverityChip severity="critical" ruleId="4.1.2" />
            ) : (
              <span className="font-mono text-xs text-muted-foreground">
                <span aria-hidden="true">✓ </span>Clean
              </span>
            )}
          </li>
        ))}
      </ol>

      <ol
        className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-6"
        aria-label="SauceDemo test store state progression"
      >
        {SAUCEDEMO_TRAIL.map((s, i) => {
          const isSelected = activeStep === i;
          return (
            <li
              key={s.path}
              onMouseEnter={() => setActiveStep(i)}
              onMouseLeave={() => setActiveStep(null)}
              className={`sheet group relative flex flex-col overflow-hidden transition-all duration-200 ${
                isSelected ? "ring-2 ring-[var(--primary)]" : ""
              }`}
            >
              {/* Top classification banner */}
              <div
                className={`flex items-center justify-between border-b px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] ${
                  s.publicUrl
                    ? "border-border bg-muted/40 text-muted-foreground"
                    : "border-border bg-[color-mix(in_oklch,var(--primary)_8%,transparent)] text-primary font-medium"
                }`}
              >
                <span className="tabular-nums font-bold">{String(i + 1).padStart(2, "0")}</span>
                <span>{s.publicUrl ? "Public scan" : "Session only"}</span>
              </div>

              {/* Wireframe Viewport Preview */}
              <div className="relative aspect-[16/10] w-full border-b border-border bg-background/50 p-2">
                <StateWireframe index={i} />
                {s.findings > 0 && (
                  <span
                    className="absolute right-2 top-2 rounded-xs border bg-card px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--redline)]"
                    style={{ borderColor: "var(--redline)" }}
                    title="Critical accessibility defect found at this state"
                  >
                    DEFECT
                  </span>
                )}
              </div>

              {/* State Content */}
              <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                <p className="font-semibold text-sm leading-tight text-foreground">{s.label}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{s.path}</p>
                <p className="mt-2.5 flex-1 text-xs leading-relaxed text-muted-foreground">{s.why}</p>

                <div className="mt-3.5 border-t border-border pt-3">
                  {s.findings > 0 ? (
                    <SeverityChip severity="critical" ruleId="4.1.2" />
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <span className="text-xs text-[var(--severity-minor)]">✓</span> Clean
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
