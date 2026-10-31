import { CHANGELOG, type ChangelogEntry } from "@/lib/changelog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

/** Hide the homepage line once the newest changelog entry is older than this. */
export const MAX_AGE_DAYS = 90;

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return m >= 1 && m <= 12 ? { y, m, d } : null;
}

/** "2026-10-28" -> "Oct 28". Parsed by hand so locale and server timezone never shift the day. */
export function formatUpdateDate(iso: string): string {
  const p = parseIso(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.d}` : "";
}

/**
 * Short form of a changelog entry: drop a leading "New: ", take the first sentence, and when
 * that is longer than `max`, keep the first clause (up to a comma) if it is at least 20 characters,
 * otherwise cut on a word boundary and add an ellipsis. Only words from the entry are used.
 */
export function shortenUpdate(text: string, max = 72): string {
  const firstSentence = (text.replace(/^New:\s*/i, "").split(/(?<=[.!?])\s/)[0] ?? "").replace(/[.!?]$/, "").trim();
  if (firstSentence.length <= max) return firstSentence;
  const comma = firstSentence.indexOf(",");
  if (comma >= 20 && comma <= max) return firstSentence.slice(0, comma);
  const cut = firstSentence.slice(0, max + 1).lastIndexOf(" ");
  return `${firstSentence.slice(0, cut > 0 ? cut : max).trimEnd()}…`;
}

/** The newest entry as a homepage line, or null when there is none or it is older than 90 days (UTC days). */
export function latestUpdate(
  entries: ChangelogEntry[] = CHANGELOG,
  now: Date = new Date(),
): { date: string; text: string } | null {
  const entry = entries[0];
  const p = entry ? parseIso(entry.date) : null;
  if (!entry || !p) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const ageDays = Math.floor((today - Date.UTC(p.y, p.m - 1, p.d)) / DAY_MS);
  if (ageDays > MAX_AGE_DAYS) return null;
  return { date: formatUpdateDate(entry.date), text: shortenUpdate(entry.text) };
}
