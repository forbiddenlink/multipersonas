import "server-only";
import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { buildGradeEmail } from "@/lib/grade-email-template";
import {
  GRADE_EMAIL_LIMITS,
  canonicalMailbox,
  type GradeEmailCaptureStatus,
} from "@/lib/grade-email";
import type { OutgoingEmail } from "@/lib/email";
import { gradeLetterFromReport, getGraderScan } from "@/lib/grade";
import { hostOf } from "@/lib/grade-share";
import type { Json } from "@/lib/supabase/types";

// The grade_email_requests table and its functions come from migration
// 20261016090000_grade_email_requests.sql, which the owner applies by hand. They are not in the
// generated Database types, so this module talks to them through one narrow interface and
// treats "function/table does not exist yet" as "feature unavailable", never as an error.

/** The slice of the Supabase client this module uses. */
export interface GradeEmailRpc {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
}

/** The generated Database types predate the migration, so view the client through the narrow interface. */
export function gradeEmailRpc(admin: unknown): GradeEmailRpc {
  return admin as GradeEmailRpc;
}

const MISSING_CODES = new Set(["42883", "42P01", "PGRST202", "PGRST205"]);

export function isMissingMigration(error: { code?: string; message: string } | null): boolean {
  if (!error) return false;
  if (error.code && MISSING_CODES.has(error.code)) return true;
  return /could not find the (function|table)|does not exist/i.test(error.message);
}

/** Hash of the canonical mailbox for the per-recipient cap: aliases share a bucket and rate_limits never stores the address. */
export function recipientKey(email: string): string {
  return `gradeemail:to:${createHash("sha256").update(canonicalMailbox(email)).digest("hex")}`;
}

const CAPTURE_STATUSES = new Set(["saved", "exists", "not_found", "expired", "rate_limited"]);

/**
 * Store one address against one grade. Never throws and never logs the address: an
 * unexpected failure is reported without it and surfaces as "unavailable".
 */
export async function captureGradeEmail(
  admin: GradeEmailRpc,
  input: { token: string; email: string; ip: string },
): Promise<GradeEmailCaptureStatus> {
  try {
    const { data, error } = await admin.rpc("request_grade_email", {
      p_token: input.token,
      p_email: input.email,
      p_ip_key: `gradeemail:ip:${input.ip}`,
      p_ip_max: GRADE_EMAIL_LIMITS.perCaller.max,
      p_to_key: recipientKey(input.email),
      p_to_max: GRADE_EMAIL_LIMITS.perRecipient.max,
      p_window_seconds: GRADE_EMAIL_LIMITS.perCaller.windowSeconds,
    });
    if (error) {
      if (!isMissingMigration(error)) {
        Sentry.captureMessage("Grade email capture failed", {
          level: "error",
          tags: { route: "grade-email", stage: "capture", code: error.code ?? "unknown" },
        });
      }
      return "unavailable";
    }
    return typeof data === "string" && CAPTURE_STATUSES.has(data)
      ? (data as GradeEmailCaptureStatus)
      : "unavailable";
  } catch {
    Sentry.captureMessage("Grade email capture threw", { level: "error", tags: { route: "grade-email", stage: "capture" } });
    return "unavailable";
  }
}

/** True once the migration is applied; used to hide the field before it is. */
export async function gradeEmailStorageReady(admin: GradeEmailRpc): Promise<boolean> {
  try {
    const { error } = await admin.rpc("pending_grade_email_tokens", { p_limit: 1 });
    return !error;
  } catch {
    return false;
  }
}

export interface GradeEmailDeps {
  origin: string;
  /** The address, or null when there is nothing to send (none, sent, unfinished, leased). */
  claim(token: string): Promise<string | null>;
  /** Record the attempt. `sent: true` erases the address. */
  /** `refund` gives the attempt back (the grade was not actually ready). */
  finish(token: string, sent: boolean, options?: { refund?: boolean }): Promise<void>;
  /** `terminal` is true only for an explicitly completed (letter set) or failed grade. */
  getScan(token: string): Promise<{ entryUrl: string; letter: string | null; terminal: boolean } | null>;
  send(message: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }>;
}

export type GradeEmailOutcome = "sent" | "skipped" | "failed";

/**
 * Send the one email for one grade. At-most-once by construction: the claim is a lease taken
 * in the database, a failed send releases it for a retry, and Resend's idempotency key stops
 * a duplicate if a send landed but the release did not.
 */
export async function sendGradeEmail(deps: GradeEmailDeps, rawToken: string): Promise<GradeEmailOutcome> {
  // One spelling everywhere: the idempotency key is derived from the token, and a caller may
  // pass an uppercase UUID while the sweep reads the lowercase one from the database.
  const token = rawToken.toLowerCase();
  const to = await deps.claim(token);
  if (!to) return "skipped";

  try {
    const scan = await deps.getScan(token);
    if (!scan) {
      await deps.finish(token, false);
      return "skipped";
    }
    if (!scan.terminal) {
      // Not finished as far as the readers of the result can tell (the worker writes the scan
      // row before the job row). Give the attempt back; the next notify or sweep sends it.
      await deps.finish(token, false, { refund: true });
      return "skipped";
    }
    const body = buildGradeEmail({
      host: hostOf(scan.entryUrl),
      letter: scan.letter,
      permalink: `${deps.origin}/grade/${token}`,
    });
    const result = await deps.send({ to, ...body, idempotencyKey: `grade-email-${token}` });
    if (!result.ok) {
      // The provider error names a status code, never the recipient.
      Sentry.captureMessage(`Grade email failed: ${result.error}`, {
        level: "error",
        tags: { route: "grade-email", stage: "send" },
      });
      await deps.finish(token, false);
      return "failed";
    }
    await deps.finish(token, true);
    return "sent";
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "grade-email", stage: "send" } });
    // Release the lease so the sweep retries; the idempotency key covers a landed send.
    await deps.finish(token, false).catch(() => {});
    return "failed";
  }
}

export interface GradeEmailSweepResult {
  sent: number;
  skipped: number;
  failed: number;
}

/** Backstop for grades whose worker notification never arrived. Oldest first, bounded. */
export async function sweepGradeEmails(
  deps: GradeEmailDeps & { listPending(limit: number): Promise<string[]>; prune(): Promise<void> },
  limit = 25,
): Promise<GradeEmailSweepResult> {
  const result: GradeEmailSweepResult = { sent: 0, skipped: 0, failed: 0 };
  await deps.prune();
  for (const token of await deps.listPending(limit)) {
    result[await sendGradeEmail(deps, token)] += 1;
  }
  return result;
}

/** Service-role data access for the notify route. */
export function supabaseGradeEmailDeps(
  db: GradeEmailRpc,
  origin: string,
  send: GradeEmailDeps["send"],
): GradeEmailDeps & { listPending(limit: number): Promise<string[]>; prune(): Promise<void> } {
  return {
    origin,
    send,
    async claim(token) {
      const { data, error } = await db.rpc("claim_grade_email", { p_token: token });
      if (error) {
        if (isMissingMigration(error)) return null;
        throw new Error(error.message);
      }
      return typeof data === "string" && data ? data : null;
    },
    async finish(token, sent, options) {
      const { error } = await db.rpc("finish_grade_email", {
        p_token: token,
        p_sent: sent,
        p_refund: options?.refund === true,
      });
      if (error) throw new Error(error.message);
    },
    async getScan(token) {
      const scan = await getGraderScan(token);
      if (!scan) return null;
      if (scan.status === "failed") return { entryUrl: scan.entry_url, letter: null, terminal: true };
      // Anything but an explicit completed WITH a readable letter is "not ready", never a failure.
      const letter = scan.status === "completed" ? gradeLetterFromReport(scan.report as Json | null) : null;
      return { entryUrl: scan.entry_url, letter, terminal: Boolean(letter) };
    },
    async listPending(limit) {
      const { data, error } = await db.rpc("pending_grade_email_tokens", { p_limit: limit });
      if (error) {
        if (isMissingMigration(error)) return [];
        throw new Error(error.message);
      }
      return Array.isArray(data) ? data.map((row: { token: string }) => row.token) : [];
    },
    async prune() {
      const { error } = await db.rpc("prune_grade_email_requests");
      if (error && !isMissingMigration(error)) throw new Error(error.message);
    },
  };
}
