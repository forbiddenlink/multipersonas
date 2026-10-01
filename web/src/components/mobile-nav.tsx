"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINK =
  "rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Mobile menu: a native disclosure (works before hydration), plus the closing behavior a
 * native <details> lacks: Escape returns focus to the toggle, a tap outside closes it, and
 * choosing a link closes it so it never covers the page it just opened.
 */
export function MobileNav({
  items,
  showSignIn,
}: {
  items: readonly { href: string; label: string }[];
  showSignIn: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  // The disclosure works before hydration, so it may already be open on mount.
  useEffect(() => {
    if (ref.current?.open) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const closeAndRestoreFocus = () => {
      const hadFocus = el.contains(document.activeElement) && document.activeElement?.tagName !== "SUMMARY";
      el.open = false;
      if (hadFocus) el.querySelector("summary")?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      el.open = false;
      el.querySelector("summary")?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) closeAndRestoreFocus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => {
    const el = ref.current;
    if (!el) return;
    el.open = false;
    el.querySelector("summary")?.focus();
  };

  return (
    <details ref={ref} onToggle={(e) => setOpen(e.currentTarget.open)} className="group relative md:hidden">
      <summary
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" className="group-open:hidden" />
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" className="hidden group-open:block" />
        </svg>
      </summary>
      <nav
        aria-label="Mobile"
        className="sheet absolute right-0 top-[calc(100%+0.5rem)] z-50 flex w-56 flex-col p-2"
      >
        {items.map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className={`${LINK} py-2.5`}>
            {l.label}
          </Link>
        ))}
        {showSignIn ? (
          <Link href="/auth/login" onClick={close} className={`${LINK} border-t border-border py-2.5`}>
            Sign in
          </Link>
        ) : null}
      </nav>
    </details>
  );
}
