import { getGraderScan } from "@/lib/grade";
import type { GradeReport } from "@engine/grader/score";

// Returns a lightweight, high-contrast SVG badge for GitHub READMEs, docs, and footers.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const scan = await getGraderScan(token);

  if (!scan || scan.status !== "completed" || !scan.report) {
    const isRunning = scan?.status === "running" || scan?.status === "queued";
    const label = isRunning ? "grading…" : "unknown";
    const svg = renderSvg("accessibility", label, "#78716c", "#1c1917");
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  const report = scan.report as unknown as GradeReport;
  const grade = report.grade;
  const score = report.score;
  const color =
    grade === "A" || grade === "B"
      ? "#0d9488"
      : grade === "C"
        ? "#d97706"
        : grade === "D"
          ? "#ea580c"
          : "#dc2626";

  const svg = renderSvg("accessibility", `${grade} (${score}/100)`, color, "#1c1917");

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

function renderSvg(
  left: string,
  right: string,
  rightBg: string,
  leftBg: string,
): string {
  const leftWidth = 92;
  const rightWidth = right.length > 7 ? 88 : 68;
  const totalWidth = leftWidth + rightWidth;
  const height = 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="${left}: ${right}">
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="${height}" fill="${leftBg}"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${rightBg}"/>
  </g>
  <g fill="#f4f1ec" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="11" font-weight="600" text-anchor="middle">
    <text x="${leftWidth / 2}" y="15" fill="#a39e95">${left}</text>
    <text x="${leftWidth + rightWidth / 2}" y="15" fill="#f4f1ec">${right}</text>
  </g>
</svg>`;
}
