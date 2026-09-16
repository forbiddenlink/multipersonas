/**
 * Encode the demand-test answers (ADR 0002) onto the existing waitlist `note`
 * column. Structured selects beat a free-text blob for both conversion (easier
 * to answer) and analysis (the admin page can count Auth need vs scan preference
 * without a migration).
 */

export const AUTH_NEED = {
  none: "none behind login",
  some: "some behind login",
  most: "most behind login",
  all: "all behind login",
} as const;

export const SCAN_PREF = {
  local: "local CLI",
  hosted: "hosted session",
  unsure: "unsure",
} as const;

export type AuthNeed = keyof typeof AUTH_NEED;
export type ScanPref = keyof typeof SCAN_PREF;

export const FOLLOW_UP_STATUSES = ["new", "contacted", "qualified", "not_now", "converted"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export type LeadAttribution = {
  source?: string;
  campaign?: string;
  referrerHost?: string;
};

const AUTH_NEED_KEYS = new Set<string>(Object.keys(AUTH_NEED));
const SCAN_PREF_KEYS = new Set<string>(Object.keys(SCAN_PREF));

export function isAuthNeed(value: string): value is AuthNeed {
  return AUTH_NEED_KEYS.has(value);
}

export function isScanPref(value: string): value is ScanPref {
  return SCAN_PREF_KEYS.has(value);
}

/** Waitlist API caps `note` at 500 characters. Compose to that bound. */
export const WAITLIST_NOTE_MAX = 500;

const ATTRIBUTION_VALUE = /^[a-z0-9][a-z0-9.-]{0,63}$/;

export function isAttributionValue(value: string): boolean {
  return ATTRIBUTION_VALUE.test(value);
}

export function isFollowUpStatus(value: string): value is FollowUpStatus {
  return (FOLLOW_UP_STATUSES as readonly string[]).includes(value);
}

/**
 * Keep marketing attribution useful without retaining query strings, paths, or other
 * potentially identifying URL data alongside a lead's email address.
 */
export function readLeadAttribution(
  search: URLSearchParams,
  referrer: string,
): LeadAttribution {
  const source = search.get("utm_source")?.trim().toLowerCase();
  const campaign = search.get("utm_campaign")?.trim().toLowerCase();
  let referrerHost: string | undefined;

  try {
    referrerHost = new URL(referrer).hostname.toLowerCase();
  } catch {
    // Direct visits and privacy-preserving browsers often omit a referrer.
  }

  return {
    ...(source && isAttributionValue(source) ? { source } : {}),
    ...(campaign && isAttributionValue(campaign) ? { campaign } : {}),
    ...(referrerHost && isAttributionValue(referrerHost) ? { referrerHost } : {}),
  };
}

export function composeWaitlistNote(input: {
  authNeed?: string;
  scanPref?: string;
  attribution?: LeadAttribution;
  note?: string;
}): string | undefined {
  const parts: string[] = [];
  if (input.authNeed && isAuthNeed(input.authNeed)) {
    parts.push(`Auth need: ${AUTH_NEED[input.authNeed]}`);
  }
  if (input.scanPref && isScanPref(input.scanPref)) {
    parts.push(`Prefer: ${SCAN_PREF[input.scanPref]}`);
  }
  if (input.attribution?.campaign && isAttributionValue(input.attribution.campaign)) {
    parts.push(`Campaign: ${input.attribution.campaign}`);
  }
  if (input.attribution?.referrerHost && isAttributionValue(input.attribution.referrerHost)) {
    parts.push(`Referred by: ${input.attribution.referrerHost}`);
  }
  const extra = input.note?.trim();
  if (extra) parts.push(extra);

  if (parts.length === 0) return undefined;

  const composed = parts.join(". ");
  return composed.length <= WAITLIST_NOTE_MAX
    ? composed
    : composed.slice(0, WAITLIST_NOTE_MAX);
}

export function parseWaitlistSignals(note: string | null | undefined): {
  authNeed?: string;
  scanPref?: string;
  campaign?: string;
  referrerHost?: string;
} {
  if (!note) return {};
  const auth = /Auth need:\s*([^.(]+)/.exec(note)?.[1]?.trim();
  const pref = /Prefer:\s*([^.(]+)/.exec(note)?.[1]?.trim();
  const campaign = /(?:^|\. )Campaign:\s*([a-z0-9.-]+)(?:\. |$)/.exec(note)?.[1];
  const referrerHost = /(?:^|\. )Referred by:\s*([a-z0-9.-]+)(?:\. |$)/.exec(note)?.[1];
  return {
    ...(auth ? { authNeed: auth } : {}),
    ...(pref ? { scanPref: pref } : {}),
    ...(campaign ? { campaign } : {}),
    ...(referrerHost ? { referrerHost } : {}),
  };
}
