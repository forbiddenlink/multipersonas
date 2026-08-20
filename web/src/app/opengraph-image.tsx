import { ImageResponse } from "next/og";

export const alt = "Personaudit — accessibility scanning for the pages behind your login";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Forensic-terminal warm-dark palette — literal values (Satori/ImageResponse doesn't
// resolve CSS custom properties or oklch()), mirrored from globals.css .dark block.
const BG = "#17130e";
const FG = "#f4f1ec";
const MUTED = "#a39e95";
const BORDER = "rgba(244, 241, 236, 0.14)";
const TEAL = "#4ecdc0"; // demoted accent — used once, not per-chip

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: BG,
          color: FG,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "2px",
            marginBottom: "32px",
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <span>Person</span>
          <span style={{ color: MUTED }}>audit</span>
            <span
              style={{
              display: "flex",
              width: "10px",
              height: "26px",
              marginLeft: "4px",
              backgroundColor: TEAL,
              borderRadius: "1px",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
          }}
        >
          Scan the pages a crawler can&apos;t reach
        </div>
        <div
          style={{
            fontSize: "22px",
            color: MUTED,
            marginTop: "24px",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          Crawls behind your login and runs axe-core at every state a page-level scan never sees
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "48px",
          }}
        >
          {["Behind login", "axe-core verdicts", "CI-gated"].map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "4px",
                border: `1px solid ${BORDER}`,
                fontSize: "14px",
                color: MUTED,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
