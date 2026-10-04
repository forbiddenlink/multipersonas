import type { GradeReport } from "@engine/grader/score";
import type { ClaimedGrade } from "@/lib/grade";

export const SHARE_FALLBACK_ORIGIN = "https://personaudit.com";

/** Hostname for display; falls back to the raw entry URL when it does not parse. */
export function hostOf(entryUrl: string): string {
  try {
    return new URL(entryUrl).host;
  } catch {
    return entryUrl;
  }
}

/** Honest share copy: states what was measured, never a compliance claim. */
export function shareText(host: string, grade: GradeReport["grade"]): string {
  return `${host} scored ${grade} on Personaudit's automated accessibility grade`;
}

export function linkedInShareUrl(resultUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resultUrl)}`;
}

export function xShareUrl(text: string, resultUrl: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(resultUrl)}`;
}

/** Path to the grade form prefilled with a URL for a re-grade. */
export function regradePath(entryUrl: string): string {
  return `/grade?url=${encodeURIComponent(entryUrl)}`;
}

/**
 * axe-core's own `helpUrl` points at dequeuniversity.com/rules/axe/<major.minor>/<id>,
 * with the version of the installed engine. Keep this in step with the axe-core the
 * crawler runs (a test compares it to the installed package).
 */
export const AXE_DOCS_VERSION = "4.13";

export function dequeRuleUrl(ruleId: string): string {
  return `https://dequeuniversity.com/rules/axe/${AXE_DOCS_VERSION}/${encodeURIComponent(ruleId)}`;
}

/** Hostname without a leading "www.", so the apex and www forms count as one site. */
export function siteKey(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Saved grades whose entry URL is on the same site as a project, so a project can show
 * the free grades its owner ran against it. Other subdomains are different sites.
 */
export function gradesForSite(grades: ClaimedGrade[], siteUrl: string): ClaimedGrade[] {
  const key = siteKey(siteUrl);
  if (!key) return [];
  return grades.filter((grade) => siteKey(grade.entry_url) === key);
}
