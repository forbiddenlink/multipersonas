import { ImageResponse } from "next/og";
import { getGraderScan } from "@/lib/grade";
import type { GradeReport } from "@engine/grader/score";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Forensic-terminal warm-dark palette — literal hex values for Satori/ImageResponse.
const BG = "#17130e";
const FG = "#f4f1ec";
const MUTED = "#a39e95";
const BORDER = "rgba(244, 241, 236, 0.14)";
const TEAL = "#4ecdc0";

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return "#4ecdc0";
  if (grade === "C") return "#f59e0b";
  if (grade === "D") return "#f97316";
  return "#ef4444";
}

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const scan = await getGraderScan(token);

  let host = "Website";
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
          backgroundColor: BG,
          color: FG,
          fontFamily: "system-ui, sans-serif",
          padding: "60px 80px",
          justifyContent: "space-between",
        }}
      >
        {/* Header wordmark and label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "2px",
              fontSize: "30px",
              fontWeight: 600,
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
              display: "flex",
              padding: "6px 14px",
              borderRadius: "4px",
              border: `1px solid ${BORDER}`,
              fontSize: "14px",
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            ACCESSIBILITY GRADE REPORT
          </div>
        </div>

        {/* Center Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${BORDER}`,
            borderRadius: "12px",
            padding: "40px 50px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "650px" }}>
            <div style={{ fontSize: "18px", color: MUTED, marginBottom: "8px" }}>
              Public Scan Result for
            </div>
            <div
              style={{
                fontSize: "40px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: FG,
                wordBreak: "break-all",
              }}
            >
              {host}
            </div>
            <div
              style={{
                display: "flex",
                gap: "20px",
                marginTop: "24px",
                fontSize: "18px",
                color: MUTED,
              }}
            >
              <span>
                Score: <strong style={{ color: FG }}>{score}/100</strong>
              </span>
              <span>·</span>
              <span>
                Violations: <strong style={{ color: FG }}>{violations}</strong>
              </span>
              <span>·</span>
              <span>axe-core verified</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "140px",
              height: "140px",
              borderRadius: "12px",
              border: `2px solid ${color}`,
              backgroundColor: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <span
              style={{
                fontSize: "80px",
                fontWeight: 800,
                color: color,
                lineHeight: 1,
              }}
            >
              {grade}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "15px",
            color: MUTED,
          }}
        >
          <span>Deterministic WCAG 2.1 / 2.2 testing · axe-core</span>
          <span>personaudit.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
