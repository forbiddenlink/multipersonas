"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The signature hero piece: the product, visibly working. A persona "walks" a demo
// checkout behind the login; axe-core verdicts land in severity colour; the persona is
// blocked and task-success reads 0/1. Types itself out, loops, pauses off-screen, and
// degrades to a complete static frame for reduced-motion / no-JS. On completion the card
// transforms — a summary chip row appears (violations · task-success · export).

type Line =
  | { kind: "step"; text: string; src?: string }
  | { kind: "ok"; text: string; src?: string }
  | { kind: "fail"; code: string; text: string; sev: "critical" | "serious"; src: string }
  | { kind: "say"; text: string }
  | { kind: "result"; text: string };

const SCRIPT: Line[] = [
  { kind: "step", text: "persona  Margaret, 74 · first-time visitor", src: "persona:checkout-flow" },
  { kind: "step", text: "open  shop.demo/checkout · saved session, behind login", src: "session" },
  { kind: "ok", text: "reached  cart → shipping → payment", src: "persona:checkout-flow" },
  { kind: "step", text: "tab to  “Complete payment”", src: "persona:checkout-flow" },
  { kind: "fail", code: "4.1.2", text: "button has no accessible name", sev: "critical", src: "axe-core" },
  { kind: "say", text: "“I can’t tell what this button actually does.”" },
  { kind: "fail", code: "1.4.3", text: "order total contrast 3.9:1", sev: "serious", src: "axe-core" },
  { kind: "step", text: "blocked  at payment step", src: "persona:checkout-flow" },
  { kind: "result", text: "task success 0 / 1 · 2 violations · report ready" },
];

// Full text alternative for assistive tech — the animated stream is aria-hidden.
const ALT =
  "Demo audit: the persona Margaret, a 74-year-old first-time visitor, opens a checkout " +
  "behind the login. axe-core flags two violations — a payment button with no accessible " +
  "name (WCAG 4.1.2, critical) and insufficient contrast on the order total (1.4.3, " +
  "serious). Margaret is blocked at the payment step. Task success 0 of 1, report ready.";

const TEAL = "var(--primary)";
const SEV_CRITICAL = "var(--severity-critical)";
const SEV_SERIOUS = "var(--severity-serious)";

const TYPE_MS = 28; // per-character (slightly calmer than a frantic typewriter)
const LINE_PAUSE = 14; // ticks held after a line completes, so each line is readable
const LOOP_HOLD = 150; // ticks held ON THE COMPLETED frame before restarting (~4.2s)

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false, // server snapshot: assume motion allowed, hero enhances on the client
  );
}

export function AuditTerminal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const [revealed, setRevealed] = useState(0); // fully-typed lines
  const [typing, setTyping] = useState(""); // partial current line
  const [sweeping, setSweeping] = useState(false);
  const prevDoneRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e) setInView(e.isIntersecting); },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Static complete frame (reduced-motion / off-screen) is derived in render — no
    // setState here, so the effect body never trips react-hooks/set-state-in-effect.
    if (reduced || !inView) return;
    let line = 0;
    let char = 0;
    let hold = 0;
    let primed = false;
    const id = window.setInterval(() => {
      if (!primed) {
        // Reset to the start once the clock is actually running (async → lint-safe).
        primed = true;
        setRevealed(0);
        setTyping("");
        return;
      }
      if (hold > 0) {
        hold -= 1;
        // The loop hold just ended and we are parked at the start of the script with the
        // completed frame still on screen. Clear it now, so the finished state is what the
        // viewer sees for the whole hold, then typing restarts on the next tick.
        if (hold === 0 && line === 0 && char === 0) {
          setRevealed(0);
          setTyping("");
        }
        return;
      }
      if (line >= SCRIPT.length) {
        // Every line is shown. Hold ON the completed frame (chips + task-success), do NOT
        // reset yet. The reset happens when this hold expires (the branch above), so the
        // end is actually visible instead of flashing for one line-pause.
        hold = LOOP_HOLD;
        line = 0;
        char = 0;
        return;
      }
      const text = SCRIPT[line]!.text;
      if (char < text.length) {
        char += 1;
        setTyping(text.slice(0, char));
      } else {
        setRevealed((r) => r + 1);
        setTyping("");
        line += 1;
        char = 0;
        hold = LINE_PAUSE;
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [reduced, inView]);

  const showAll = reduced || !inView;
  const shownCount = showAll ? SCRIPT.length : revealed;
  const shownTyping = showAll ? "" : typing;
  const done = shownCount >= SCRIPT.length;
  const progress = Math.min(shownCount / SCRIPT.length, 1);

  // Brief scan-sweep beam when the audit completes — evidence-materialized moment.
  useEffect(() => {
    if (done && !prevDoneRef.current && !reduced) {
      setSweeping(true);
      const t = setTimeout(() => setSweeping(false), 800);
      prevDoneRef.current = true;
      return () => clearTimeout(t);
    }
    if (!done) {
      prevDoneRef.current = false;
    }
  }, [done, reduced]);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={ALT}
      className="relative overflow-hidden rounded-md border border-white/10 font-mono text-[13px] leading-relaxed text-white/85 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      style={{ backgroundColor: "oklch(0.19 0.006 70)" }}
    >
      {/* Scan-sweep beam: evidence-materialized flash when audit completes. */}
      {sweeping && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            width: "30%",
            background: "linear-gradient(90deg, transparent 0%, oklch(0.72 0.12 195 / 0.09) 40%, oklch(0.72 0.12 195 / 0.16) 50%, oklch(0.72 0.12 195 / 0.09) 60%, transparent 100%)",
            animation: "scan-sweep-beam 700ms cubic-bezier(0.4,0,0.6,1) forwards",
          }}
        />
      )}
      {/* prompt line: host label + single live dot (no fake traffic-light dots) */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-xs">
        <span className="select-none text-white/40" aria-hidden="true">
          ┌─
        </span>
        <span className="text-white/65">personaudit</span>
        <span className="text-white/55" aria-hidden="true">
          ~/audit
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-white/60">
          <span
            className="size-1.5 rounded-full motion-safe:animate-pulse"
            style={{ backgroundColor: done ? "var(--severity-serious)" : TEAL }}
          />
          {done ? "complete" : "running"}
        </span>
      </div>

      {/* stream — wraps within the card; mono lines never break page layout */}
      <div aria-hidden="true" className="min-h-[384px] space-y-1 px-4 py-4 sm:min-h-[236px]">
        {SCRIPT.slice(0, shownCount).map((l, i) => (
          <TerminalLine key={i} line={l} />
        ))}
        {!done && (
          <p className="break-words text-white/85">
            <TypedPrefix />
            {shownTyping}
            <span
              className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] motion-safe:animate-pulse"
              style={{ backgroundColor: TEAL }}
            />
          </p>
        )}
      </div>

      {/* on completion the card transforms to a summary chip row + task-success meter */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className={`mb-3 flex min-h-6 flex-wrap items-center gap-2 text-xs ${done ? "" : "invisible"}`}>
          <SummaryChip color={SEV_CRITICAL} glyph="■" label="1 critical" />
          <SummaryChip color={SEV_SERIOUS} glyph="▲" label="1 serious" />
          <span className="rounded-sm border border-white/15 px-2 py-0.5 text-white/60">
            export report →
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">task success</span>
          <span className="tabular-nums text-white/70">
            {done ? "0 / 1 — blocked" : "auditing…"}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-sm bg-white/10">
          <div
            className="h-full rounded-sm"
            style={{
              width: `${Math.round(progress * 100)}%`,
              transition: "width 300ms ease-out",
              ...(done
                ? { backgroundColor: "var(--severity-serious)" }
                : {
                    background: `linear-gradient(90deg, ${TEAL} 0%, oklch(0.82 0.14 195) 50%, ${TEAL} 100%)`,
                    backgroundSize: "200% 100%",
                    animation: "shimmer-scan 1.4s linear infinite",
                  }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ color, glyph, label }: { color: string; glyph: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 tabular-nums"
      style={{
        // Outline chip, no fill — a faint tint drops severity-color text below AA.
        // Matches the canonical SeverityChip primitive (forensic/severity-chip.tsx).
        color,
        borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
      }}
    >
      <span className="text-[0.7em] leading-none">{glyph}</span>
      {label}
    </span>
  );
}

function TypedPrefix() {
  return (
    <span className="select-none" style={{ color: TEAL }}>
      ›&nbsp;
    </span>
  );
}

function SourceTag({ src }: { src: string }) {
  return <span className="select-none text-white/55">[{src}]&nbsp;</span>;
}

function TerminalLine({ line }: { line: Line }) {
  switch (line.kind) {
    case "step":
      return (
        <p className="break-words text-white/85">
          <TypedPrefix />
          {line.src ? <SourceTag src={line.src} /> : null}
          {line.text}
        </p>
      );
    case "ok":
      return (
        <p className="break-words" style={{ color: TEAL }}>
          {line.src ? <SourceTag src={line.src} /> : null}
          <span className="select-none">✓&nbsp;</span>
          {line.text}
        </p>
      );
    case "fail":
      return (
        <p className="break-words" style={{ color: line.sev === "critical" ? SEV_CRITICAL : SEV_SERIOUS }}>
          <SourceTag src={line.src} />
          <span className="select-none" aria-hidden="true">
            {line.sev === "critical" ? "■" : "▲"}&nbsp;
          </span>
          <span className="rounded-sm bg-white/5 px-1 tabular-nums">{line.code}</span>{" "}
          {line.text}
        </p>
      );
    case "say":
      return <p className="break-words pl-4 italic text-white/70">{line.text}</p>;
    case "result":
      return (
        <p className="mt-1 break-words border-t border-white/10 pt-2 font-medium text-white">
          {line.text}
        </p>
      );
  }
}
