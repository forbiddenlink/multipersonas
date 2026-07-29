import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Forensic-terminal warm-dark palette — literal values (Satori/ImageResponse doesn't
// resolve CSS custom properties or oklch()), mirrored from globals.css .dark block.
const BG = "#17130e";
const FG = "#f4f1ec";
const TEAL = "#4ecdc0"; // demoted accent — a single cursor block, not the fill

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: BG,
          borderRadius: "28px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontSize: "100px",
              fontWeight: 700,
              color: FG,
            }}
          >
            P
          </span>
          <span
            style={{
              display: "block",
              width: "16px",
              height: "70px",
              marginLeft: "6px",
              marginBottom: "6px",
              backgroundColor: TEAL,
              borderRadius: "2px",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
