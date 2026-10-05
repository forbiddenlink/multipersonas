import type { Severity } from "@engine/domain/vocab";

/**
 * Email body for one finished scheduled scan. Pure so the wording can be tested:
 * the counts come from the same defect comparison the project page shows
 * (lib/baseline.ts), and every claim stays inside what axe actually observed.
 */
export interface ScanDigestInput {
  projectName: string;
  siteUrl: string;
  projectUrl: string;
  /** Link to the saved run; null when the scan did not produce one. */
  runUrl: string | null;
  outcome: "completed" | "failed";
  /** Null when the scan failed, so there is nothing to compare. */
  regression: {
    isFirstScan: boolean;
    newDefects: Array<{ title: string; severity: Severity; pageUrl: string }>;
    cleared: Array<{ title: string; severity: Severity }>;
    unchangedCount: number;
  } | null;
  taskSuccess?: { achieved: number; total: number } | null;
}

export interface ScanDigest {
  subject: string;
  text: string;
  html: string;
}

const LIST_CAP = 5;

const FOOTER =
  "Automated checks only (axe-core). This is not a compliance statement, and some issues need a person to review.";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function subjectFor(input: ScanDigestInput): string {
  const r = input.regression;
  if (input.outcome === "failed" || !r) return `${input.projectName}: scheduled scan did not finish`;
  if (r.isFirstScan) return `${input.projectName}: first scheduled scan finished`;
  if (r.newDefects.length === 0 && r.cleared.length === 0) {
    return `${input.projectName}: no change since the last scan`;
  }
  const parts: string[] = [];
  if (r.newDefects.length) parts.push(plural(r.newDefects.length, "new issue"));
  if (r.cleared.length) parts.push(`${r.cleared.length} fixed`);
  return `${input.projectName}: ${parts.join(", ")}`;
}

interface Section {
  heading: string;
  items: string[];
  more: number;
}

function capped<T>(items: T[], render: (item: T) => string): { items: string[]; more: number } {
  return {
    items: items.slice(0, LIST_CAP).map(render),
    more: Math.max(0, items.length - LIST_CAP),
  };
}

function sectionsFor(input: ScanDigestInput): { intro: string[]; sections: Section[] } {
  const r = input.regression;
  if (input.outcome === "failed" || !r) {
    return {
      intro: [
        `The scheduled scan of ${input.siteUrl} did not finish, so there are no new results this time.`,
        "Your schedule stays on. Open the project to run it again or check the site address.",
      ],
      sections: [],
    };
  }

  const intro: string[] = [
    r.isFirstScan
      ? `The first scheduled scan of ${input.siteUrl} finished. Later scans are compared against it.`
      : `The scheduled scan of ${input.siteUrl} finished. Here is what changed since the last scan.`,
  ];
  if (input.taskSuccess && input.taskSuccess.total > 0) {
    intro.push(`${input.taskSuccess.achieved} of ${input.taskSuccess.total} tasks completed.`);
  }

  const sections: Section[] = [];
  if (r.newDefects.length) {
    sections.push({
      heading: "New issues",
      ...capped(r.newDefects, (d) => `${d.title} (${d.severity}) on ${d.pageUrl}`),
    });
  }
  if (!r.isFirstScan && r.cleared.length) {
    sections.push({
      heading: "Fixed since the last scan",
      ...capped(r.cleared, (d) => `${d.title} (${d.severity})`),
    });
  }
  if (!r.isFirstScan && r.unchangedCount > 0) {
    intro.push(`${plural(r.unchangedCount, "issue")} unchanged.`);
  }
  return { intro, sections };
}

export function buildScanDigest(input: ScanDigestInput): ScanDigest {
  const subject = subjectFor(input);
  const { intro, sections } = sectionsFor(input);
  const link = input.runUrl ?? input.projectUrl;
  const linkLabel = input.runUrl ? "Open the full results" : "Open the project";
  const optOut = `Turn off these emails on the project page: ${input.projectUrl}`;

  const textLines: string[] = [...intro, ""];
  for (const s of sections) {
    textLines.push(`${s.heading}:`);
    for (const item of s.items) textLines.push(`- ${item}`);
    if (s.more) textLines.push(`- and ${s.more} more`);
    textLines.push("");
  }
  textLines.push(`${linkLabel}: ${link}`, "", FOOTER, optOut);

  const htmlSections = sections
    .map((s) => {
      const items = s.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const more = s.more ? `<li>and ${s.more} more</li>` : "";
      return `<h2 style="font-size:16px;margin:20px 0 8px">${escapeHtml(s.heading)}</h2><ul style="padding-left:20px;margin:0">${items}${more}</ul>`;
    })
    .join("");

  const html = [
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:560px">`,
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(subject)}</h1>`,
    ...intro.map((p) => `<p style="margin:0 0 8px">${escapeHtml(p)}</p>`),
    htmlSections,
    `<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="color:#1a1a1a;font-weight:600">${linkLabel}</a></p>`,
    `<p style="font-size:13px;color:#555;margin:0 0 4px">${escapeHtml(FOOTER)}</p>`,
    `<p style="font-size:13px;color:#555;margin:0">Turn off these emails on the <a href="${escapeHtml(input.projectUrl)}" style="color:#555">project page</a>.</p>`,
    `</div>`,
  ].join("");

  return { subject, text: textLines.join("\n"), html };
}
