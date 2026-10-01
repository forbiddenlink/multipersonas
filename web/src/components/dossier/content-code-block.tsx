"use client";

import { useRef, useState } from "react";
import styles from "./content-prose.module.css";

type CopyState = "idle" | "copied" | "failed";

/**
 * A code sheet with a copy button. Silent success: the button's own label flips to
 * "Copied", and a visually-hidden `aria-live` region announces it for screen reader
 * users — no toast. There is no `document.execCommand` fallback (deprecated, and
 * unreliable outside a direct user gesture): if the Clipboard API is unavailable or
 * denied, the button shows "Copy failed" and the code stays selectable/readable —
 * the control never silently does nothing.
 */
export function ContentCodeBlock({
  code,
  label,
}: {
  code: string;
  /** Short mono caption above the block, e.g. "install", "ci gate". */
  label?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const preRef = useRef<HTMLPreElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    } finally {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState("idle"), 2200);
    }
  }

  const label_ =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";

  return (
    <div className={styles.codeBlock}>
      {label ? <span className={styles.codeLabel}>{label}</span> : null}
      <pre
        ref={preRef}
        tabIndex={0}
        role="region"
        aria-label={label ? `${label} command` : "Command"}
        className={`${styles.codePre} ${code.includes("\n") ? "" : styles.codeWrap}`}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className={styles.copyBtn}
        data-copied={state === "copied" || undefined}
        data-failed={state === "failed" || undefined}
      >
        {label_}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied"
          ? "Copied to clipboard"
          : state === "failed"
            ? "Copy failed. Select the command text and copy it manually."
            : ""}
      </span>
    </div>
  );
}
