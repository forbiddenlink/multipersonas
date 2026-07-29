"use client";

// Root fallback when the whole app tree crashes: renders its own <html>, so no Tailwind
// tokens are available — literal warm-dark hex mirrored from the .dark token block, in a
// terminal-native frame. (globals.css .dark: bg oklch(0.15 0.006 70) ≈ #17130e, etc.)
const BG = "#17130e";
const CARD = "#221d16";
const FG = "#f4f1ec";
const MUTED = "#a39e95";
const BORDER = "rgba(244,241,236,0.14)";
const TEAL = "#4ecdc0";
const CRITICAL = "#f0623f";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: BG, color: FG, fontFamily: MONO, margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "1rem" }}>
          <div style={{ width: "100%", maxWidth: "28rem", border: `1px solid ${BORDER}`, borderRadius: "0.375rem", backgroundColor: CARD, fontSize: "0.875rem" }}>
            <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "0.625rem 1rem", fontSize: "0.75rem", color: MUTED }}>
              <span style={{ color: TEAL }}>┌─ </span>personaudit ~/error
            </div>
            <div style={{ padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ margin: 0, color: CRITICAL }}>✗ fail — something broke</p>
              <p style={{ margin: 0, color: MUTED, wordBreak: "break-word" }}>
                {error.message || "An unexpected error occurred. Try refreshing the page."}
              </p>
              <button
                onClick={reset}
                style={{ alignSelf: "flex-start", padding: "0.375rem 0.75rem", borderRadius: "0.25rem", backgroundColor: "transparent", color: FG, border: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: "0.875rem", cursor: "pointer" }}
              >
                <span style={{ color: TEAL }}>›&nbsp;</span>retry
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
