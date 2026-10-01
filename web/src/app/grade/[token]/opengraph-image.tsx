import { ImageResponse } from "next/og";
import { getGraderScan } from "@/lib/grade";
import { ogFonts } from "@/lib/og-fonts";
import { PALETTE } from "@/lib/og-palette";
import type { GradeReport } from "@engine/grader/score";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Evidence Dossier palette (src/lib/og-palette.ts), so a shared grade card is the same
// case file as the site and the root card.
const { desk: DESK, sheet: SHEET, ink: INK, muted: MUTED, rule: BORDER, redline: REDLINE, primary: PRIMARY, serious: SERIOUS, moderate: MODERATE } = PALETTE;

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return PRIMARY;
  if (grade === "C") return MODERATE;
  if (grade === "D") return SERIOUS;
  return REDLINE; // critical / F
}

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [scan, fonts] = await Promise.all([getGraderScan(token), ogFonts()]);

  let host = "a website";
  if (scan?.entry_url) {
    try {
      host = new URL(scan.entry_url).host;
    } catch {
      host = scan.entry_url;
    }
  }

  const report = (scan?.report as unknown as GradeReport) ?? null;
  const grade = report?.grade ?? "–";
  const score = report?.score ?? 0;
  const violations = report?.totalViolations ?? 0;
  const color = gradeColor(grade);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: DESK,
          color: INK,
          fontFamily: fonts.some((f) => f.name === "Plex Mono") ? "Plex Mono" : "monospace",
          padding: "56px 72px",
          justifyContent: "space-between",
        }}
      >
        {/* File tab + wordmark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "28px",
              fontWeight: 600,
              fontFamily: fonts.some((f) => f.name === "Newsreader") ? "Newsreader" : "serif",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none">
              <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke={REDLINE} strokeWidth="1.6" />
              <path d="M5.5 10.5l3 3 6-7" stroke={REDLINE} strokeWidth="2" strokeLinecap="square" />
            </svg>
            Personaudit
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 14px",
              borderRadius: "3px",
              border: `1px solid ${BORDER}`,
              fontSize: "13px",
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Case file · accessibility grade
          </div>
        </div>

        {/* The sheet */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: SHEET,
            border: `1px solid ${BORDER}`,
            borderRadius: "4px",
            padding: "44px 52px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "660px" }}>
            <div style={{ fontSize: "16px", color: MUTED, marginBottom: "10px", letterSpacing: "0.04em" }}>
              Public scan result for
            </div>
            <div
              style={{
                fontSize: "42px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: INK,
                wordBreak: "break-all",
                fontFamily: fonts.some((f) => f.name === "Newsreader") ? "Newsreader" : "serif",
              }}
            >
              {host}
            </div>
            <div style={{ display: "flex", gap: "18px", marginTop: "22px", fontSize: "17px", color: MUTED }}>
              <span>
                Score: <strong style={{ color: INK }}>{score}/100</strong>
              </span>
              <span>·</span>
              <span>
                Violations: <strong style={{ color: INK }}>{violations}</strong>
              </span>
              <span>·</span>
              <span>axe-core</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              width: "132px",
              height: "132px",
              borderRadius: "3px",
              border: `3px solid ${color}`,
              transform: "rotate(-4deg)",
            }}
          >
            <span style={{ fontSize: "68px", fontWeight: 700, color, lineHeight: 1 }}>{grade}</span>
            <span style={{ fontSize: "12px", color, letterSpacing: "0.1em" }}>VERDICT</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: MUTED }}>
          <span>Deterministic WCAG 2.1 / 2.2 testing · axe-core · no overlay</span>
          <span>personaudit.com</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
