"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The signature hero piece: the product, visibly working. A persona "walks" a demo
// checkout behind the login; axe-core verdicts land in severity colour; the persona is
// blocked and task-success reads 0/1. Types itself out, loops, pauses off-screen, and
// degrades to a complete static frame for reduced-motion / no-JS.

type Line =
  | { kind: "step"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "fail"; code: string; text: string }
  | { kind: "say"; text: string }
  | { kind: "result"; text: string };

const SCRIPT: Line[] = [
  { kind: "step", text: "persona  Margaret, 74 · first-time visitor" },
  { kind: "step", text: "open  shop.demo/checkout  · saved session, behind login" },
  { kind: "ok", text: "reached  cart → shipping → payment" },
  { kind: "step", text: "tab to  “Complete payment”" },
  { kind: "fail", code: "4.1.2", text: "button has no accessible name" },
  { kind: "say", text: "“I can’t tell what this button actually does.”" },
  { kind: "fail", code: "1.4.3", text: "order total contrast 3.9:1" },
  { kind: "step", text: "blocked  at payment step" },
  { kind: "result", text: "task success 0 / 1   ·   2 violations   ·   report ready" },
];

// Full text alternative for assistive tech — the animated stream is aria-hidden.
const ALT =
  "Demo audit: the persona Margaret, a 74-year-old first-time visitor, opens a checkout " +
  "behind the login. axe-core flags two violations — a payment button with no accessible " +
  "name (WCAG 4.1.2) and insufficient contrast on the order total (1.4.3). Margaret is " +
  "blocked at the payment step. Task success 0 of 1, report ready.";

const TYPE_MS = 22; // per-character
const LINE_PAUSE = 9; // ticks held after a line completes
const LOOP_HOLD = 150; // ticks held on the final frame before restarting

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

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
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
        return;
      }
      if (line >= SCRIPT.length) {
        hold = LOOP_HOLD;
        line = 0;
        char = 0;
        setRevealed(0);
        setTyping("");
        return;
      }
      const text = SCRIPT[line].text;
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

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={ALT}
      className="overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.17_0.012_240)] font-mono text-[13px] leading-relaxed shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
    >
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="ml-1 text-xs text-white/40">personaudit · live demo</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
          <span className="size-1.5 rounded-full bg-[oklch(0.72_0.12_195)] motion-safe:animate-pulse" />
          running
        </span>
      </div>

      {/* stream */}
      <div aria-hidden="true" className="min-h-[236px] space-y-1 px-4 py-4">
        {SCRIPT.slice(0, shownCount).map((l, i) => (
          <TerminalLine key={i} line={l} />
        ))}
        {!done && (
          <p className="text-white/85">
            <TypedPrefix />
            {shownTyping}
            <span className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-[oklch(0.72_0.12_195)] motion-safe:animate-pulse" />
          </p>
        )}
      </div>

      {/* task-success meter */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">task success</span>
          <span className="tabular-nums text-white/70">
            {done ? "0 / 1 — blocked" : "auditing…"}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[oklch(0.72_0.12_195)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TypedPrefix() {
  return <span className="select-none text-[oklch(0.72_0.12_195)]">›&nbsp;</span>;
}

function TerminalLine({ line }: { line: Line }) {
  switch (line.kind) {
    case "step":
      return (
        <p className="text-white/85">
          <TypedPrefix />
          {line.text}
        </p>
      );
    case "ok":
      return (
        <p style={{ color: "oklch(0.72 0.10 195)" }}>
          <span className="select-none">✓&nbsp;</span>
          {line.text}
        </p>
      );
    case "fail":
      return (
        <p style={{ color: "oklch(0.72 0.16 55)" }}>
          <span className="select-none">✗&nbsp;</span>
          <span className="rounded bg-white/5 px-1 tabular-nums">{line.code}</span>{" "}
          {line.text}
        </p>
      );
    case "say":
      return <p className="pl-4 italic text-white/45">{line.text}</p>;
    case "result":
      return (
        <p className="mt-1 border-t border-white/10 pt-2 font-medium text-white">
          {line.text}
        </p>
      );
  }
}
