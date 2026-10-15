// Shared (client + server) rules for the optional "email me this grade" capture.
// Pure on purpose: no I/O, so the validation and the caps are unit-testable.

/** RFC 5321 path limit. */
export const GRADE_EMAIL_MAX_LENGTH = 254;

/**
 * Abuse caps, each counted per window. `perCaller` bounds how many addresses one
 * network can submit; `perRecipient` bounds how many grade emails any one address can be
 * made to receive, which is what stops a third party being mail-bombed.
 */
export const GRADE_EMAIL_LIMITS = {
  perCaller: { max: 5, windowSeconds: 24 * 60 * 60 },
  perRecipient: { max: 3, windowSeconds: 24 * 60 * 60 },
} as const;

const LOCAL_CHARS = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Trim and lowercase, then accept only plain ASCII addresses (no quoted locals, no
 * comments, no IP-literal domains, no IDN). Returns null when unusable. A strict shape
 * keeps header-injection characters and odd routing forms out of the mail provider call.
 */
export function normalizeGradeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (value.length < 6 || value.length > GRADE_EMAIL_MAX_LENGTH) return null;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64) return null;
  if (!LOCAL_CHARS.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return null;
  }
  const labels = domain.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((label) => DOMAIN_LABEL.test(label))) return null;
  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1]!)) return null;
  return value;
}

export type GradeEmailCaptureStatus =
  | "saved"
  | "exists"
  | "not_found"
  | "expired"
  | "rate_limited"
  | "unavailable";

/** Providers documented to deliver "name+tag" to "name". Elsewhere "+" can be a literal character. */
const PLUS_ALIAS_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "icloud.com", "me.com", "fastmail.com", "proton.me", "protonmail.com",
]);

/**
 * The mailbox an address really delivers to, used ONLY as the quota identity so aliases of
 * one inbox share one bucket. Strips a "+tag" only on providers known to treat it as an
 * alias (folding it on other domains would merge unrelated mailboxes into one quota); on
 * Gmail also strips dots and folds googlemail.com into gmail.com. The submitted address is
 * still what mail is sent to.
 */
export function canonicalMailbox(email: string): string {
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0 && PLUS_ALIAS_DOMAINS.has(domain)) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}
