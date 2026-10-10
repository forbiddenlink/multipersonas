import { randomBytes } from "node:crypto";

/** 32 random bytes, base64url without padding: 43 characters, 256 bits of entropy. */
export const SHARE_TOKEN_BYTES = 32;
export const SHARE_TOKEN_LENGTH = 43;
/** Default lifetime of a new share link. Shown to the owner next to the link. */
export const SHARE_LINK_DEFAULT_DAYS = 30;

const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Server-side only: uses Node crypto randomness, never Math.random. */
export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

/**
 * Shape check only. It lets the route skip a database call for an obviously wrong value;
 * it never decides access. The database function is the authority.
 */
export function isShareTokenShape(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_RE.test(value);
}

export function defaultShareExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_LINK_DEFAULT_DAYS * DAY_MS);
}

export interface ShareColumns {
  share_token: string | null;
  share_expires_at: string | null;
  share_revoked_at: string | null;
}

export type ShareState = "none" | "active" | "expired" | "revoked";

/**
 * Mirrors the database predicate in `_shared_run_id` so the owner UI shows what a
 * visitor would get. A token without an expiry is treated as expired because the
 * database never serves it.
 */
export function shareState(cols: ShareColumns, now: Date = new Date()): ShareState {
  if (!cols.share_token) return "none";
  if (cols.share_revoked_at) return "revoked";
  if (!cols.share_expires_at) return "expired";
  return new Date(cols.share_expires_at).getTime() > now.getTime() ? "active" : "expired";
}
