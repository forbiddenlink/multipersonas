import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";

export const alt = "Personaudit: scan behind the login, keep the password";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Evidence-dossier palette as literal hex (Satori can't read CSS vars or oklch()).
// Converted from the :root tokens in globals.css.
const DESK = "#f8f4eb";
const SHEET = "#fefdfa";
const INK = "#141b26";
const MUTED = "#515865";
const RULE = "#d6cfc1";
const REDLINE = "#b71a18";
const HIGHLIGHT = "#f8e899";

export default async function OGImage() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: DESK,
          color: INK,
          padding: "64px 72px",
          fontFamily: "Newsreader, Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "620px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "30px", fontWeight: 600 }}>
            <svg width="34" height="34" viewBox="0 0 20 20" fill="none">
              <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke={REDLINE} strokeWidth="1.6" />
              <path d="M5.5 10.5l3 3 6-7" stroke={REDLINE} strokeWidth="2" strokeLinecap="square" />
            </svg>
            Personaudit
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "76px", lineHeight: 1.02, letterSpacing: "-0.03em" }}>
              Scan behind the login. Keep the password.
            </div>
            <div
              style={{
                marginTop: "28px",
                fontSize: "26px",
                color: MUTED,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.4,
              }}
            >
              axe-core at every state a signed-in crawl reaches.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: "18px", color: MUTED, fontFamily: "Plex Mono, monospace", letterSpacing: "0.08em" }}>
            PERSONAUDIT.COM
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "auto",
            width: "380px",
            backgroundColor: SHEET,
            border: `1px solid ${RULE}`,
            borderLeft: `2px solid ${REDLINE}`,
            padding: "36px 32px",
            transform: "rotate(1.5deg)",
          }}
        >
          <div style={{ fontSize: "15px", fontFamily: "Plex Mono, monospace", color: MUTED, letterSpacing: "0.1em" }}>
            CASE PA-0426 · SAUCEDEMO.COM
          </div>
          <div style={{ marginTop: "16px", fontSize: "30px", lineHeight: 1.15, borderBottom: `3px solid ${INK}`, paddingBottom: "18px" }}>
            The public page passed. The flow behind it didn&apos;t.
          </div>
          <div style={{ display: "flex", marginTop: "22px", fontSize: "20px", lineHeight: 1.45 }}>
            <span style={{ backgroundColor: HIGHLIGHT, padding: "0 4px" }}>
              Behind auth, a crawler without a session never reaches it.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              alignSelf: "flex-end",
              marginTop: "34px",
              padding: "10px 18px",
              border: `3px solid ${REDLINE}`,
              color: REDLINE,
              fontFamily: "Plex Mono, monospace",
              fontWeight: 700,
              fontSize: "28px",
              letterSpacing: "0.08em",
              transform: "rotate(-5deg)",
            }}
          >
            3 CRITICAL
            <span style={{ fontSize: "13px", letterSpacing: "0.14em" }}>0 ON PUBLIC PAGE</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
