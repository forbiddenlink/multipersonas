"use client";

import type { ReactNode } from "react";

/**
 * A link to the free-grade field that also moves focus into it. Without JS it is a plain
 * `#scan` anchor, so it still works; with JS the visitor lands in the field, ready to type.
 */
export function FocusGradeLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a
      href="#scan"
      className={className}
      onClick={(e) => {
        const field = document.querySelector<HTMLInputElement>("#scan input[type='url']");
        if (!field) return;
        e.preventDefault();
        field.scrollIntoView({ block: "center" });
        field.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
