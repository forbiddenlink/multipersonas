"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Root fallback when the whole app tree crashes: renders its own <html>, so no
// Tailwind classes or CSS custom properties are available — literal hex mirrored
// from globals.css's .dark token block (night desk), in the same dossier "sheet"
// frame as error.tsx. (background oklch(0.175 0.014 262) ≈ #1b1e26, etc.)
const BG = "#1b1e26";
const CARD = "#23262f";
const FG = "#f1eee7";
const MUTED = "#b7b2a8";
const BORDER = "rgba(241,238,231,0.13)";
const PRIMARY = "#aab7e8";
const REDLINE = "#e2694a";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const SERIF = "ui-serif, Georgia, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: BG, color: FG, fontFamily: SANS, margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "1.5rem" }}>
          <div style={{ width: "100%", maxWidth: "28rem" }}>
            <div
              style={{
                display: "inline-flex",
                marginLeft: "1.25rem",
                padding: "0.25rem 0.75rem",
                border: `1px solid ${BORDER}`,
                borderBottom: 0,
                borderRadius: "0.1875rem 0.1875rem 0 0",
                backgroundColor: CARD,
                fontFamily: MONO,
                fontSize: "0.6875rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              Case unreadable
            </div>
            <div
              style={{
                marginTop: "-1px",
                border: `1px solid ${BORDER}`,
                borderRadius: "0.1875rem",
                backgroundColor: CARD,
                padding: "1.75rem 1.5rem 2rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                <div>
                  <p style={{ margin: 0, fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
                    Something broke
                  </p>
                  <h1 style={{ margin: "0.5rem 0 0", fontFamily: SERIF, fontWeight: 500, letterSpacing: "-0.02em", fontSize: "1.6rem", lineHeight: 1.1 }}>
                    This page didn&apos;t load.
                  </h1>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "0.4rem 0.7rem",
                    border: `2px solid ${REDLINE}`,
                    borderRadius: "2px",
                    color: REDLINE,
                    fontFamily: MONO,
                    fontWeight: 600,
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transform: "rotate(-4deg)",
                  }}
                >
                  Unreadable
                </span>
              </div>
              <p style={{ marginTop: "1rem", marginBottom: 0, maxWidth: "22rem", color: MUTED, lineHeight: 1.6, wordBreak: "break-word" }}>
                {error.message || "Try again. If this keeps happening, reload the page."}
              </p>
              <div style={{ marginTop: "1.75rem", borderTop: `1px solid ${BORDER}`, paddingTop: "1.5rem" }}>
                <button
                  onClick={reset}
                  style={{
                    height: "2.5rem",
                    padding: "0 1.25rem",
                    borderRadius: "0.1875rem",
                    border: "none",
                    backgroundColor: PRIMARY,
                    color: "#171a22",
                    fontFamily: SANS,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
