import { ImageResponse } from "next/og";
import { getGraderScan } from "@/lib/grade";
import type { GradeReport } from "@engine/grader/score";

export const alt = "Free accessibility grade — Personaudit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Forensic-terminal warm-dark palette — literal values (Satori/ImageResponse doesn't
// resolve CSS custom properties or oklch()), mirrored from globals.css .dark block and
// the same literal set used by src/app/opengraph-image.tsx / global-error.tsx.
const BG = "#17130e";
const FG = "#f4f1ec";
const MUTED = "#a39e95";
const BORDER = "rgba(244, 241, 236, 0.14)";
const TEAL = "#4ecdc0";
const MODERATE = "#e4b750";
const SERIOUS = "#ef852e";
const CRITICAL = "#f0623f";

function gradeColor(grade: GradeReport["grade"]): string {
  if (grade === "A" || grade === "B") return TEAL;
  if (grade === "C") return MODERATE;
  if (grade === "D") return SERIOUS;
  return CRITICAL;
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const scan = await getGraderScan(token);
  const report =
    scan?.status === "completed" && scan.report
      ? (scan.report as unknown as GradeReport)
      : null;

  let host = "a page";
  if (scan) {
    try {
      host = new URL(scan.entry_url).host;
    } catch {
      host = scan.entry_url;
    }
  }

  // Fallback frame: scan missing, still running, or failed — no grade to show yet.
  if (!report) {
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
                display: "inline-block",
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
              fontSize: "44px",
              fontWeight: 700,
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Grading {host}…
          </div>
          <div style={{ display: "flex", fontSize: "22px", color: MUTED, marginTop: "24px" }}>
            Free accessibility grade — axe-core, no signup
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const color = gradeColor(report.grade);

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
            marginBottom: "28px",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: MUTED,
          }}
        >
          <span style={{ color: FG }}>Person</span>
          <span>audit</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "220px",
              fontWeight: 700,
              lineHeight: 1,
              color,
            }}
          >
            {report.grade}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", fontSize: "36px", fontWeight: 600, color: FG }}>
              {host}
            </div>
            <div style={{ display: "flex", fontSize: "24px", color: MUTED }}>
              {report.totalViolations} violation{report.totalViolations === 1 ? "" : "s"} ·{" "}
              {report.pagesScanned} page{report.pagesScanned === 1 ? "" : "s"} scanned
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "48px" }}>
          {["axe-core verdicts", "public pages only", "no signup"].map((name) => (
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
    { ...size },
  );
}
