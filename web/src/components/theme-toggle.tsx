"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// Read the current theme straight from the <html> class the no-FOUC layout script
// set before paint. useSyncExternalStore avoids a set-state-in-effect and stays
// hydration-safe: SSR + first client render use the dark-first server snapshot,
// then it reconciles to the real DOM value.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => true, // dark-first default during SSR
  );

  function toggle() {
    const next = !isDark;
    // Mutating the class fires the MutationObserver above, which re-renders this button.
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable — the toggle still works for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={isDark}
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
