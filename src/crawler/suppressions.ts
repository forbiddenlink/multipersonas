import * as fs from "node:fs";
import { z } from "zod";

/**
 * Suppressions: defects the team has accepted for now, each with a reason, an
 * owner and an expiry. Same idea as the "accepted-risk" finding status in the web
 * app (domain/vocab.ts), but file-based so it works in CI without an account.
 *
 * An ignore with no expiry rots: nobody remembers why it is there. So a
 * suppression stops hiding its defect on its expiry date, and the gate fails
 * while the defect is still present.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((s) => {
    // Round-trip so 2026-02-30 is rejected instead of rolling over to March.
    const t = Date.parse(`${s}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().startsWith(s);
  }, "is not a real calendar date");

const nonEmpty = (field: string) => z.string({ error: `${field} is required` }).trim().min(1, `${field} must not be empty`);

export const suppressionSchema = z.object({
  /** Stable defect key (defect-key.ts), as printed in scan.json. */
  key: nonEmpty("key"),
  reason: nonEmpty("reason"),
  owner: nonEmpty("owner"),
  /** Last day the suppression applies, inclusive (UTC). */
  expires: isoDate,
});

export type Suppression = z.infer<typeof suppressionSchema>;

export const suppressionsFileSchema = z
  .object({ suppressions: z.array(suppressionSchema) })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.suppressions.forEach((s, i) => {
      if (seen.has(s.key)) ctx.addIssue({ code: "custom", path: ["suppressions", i, "key"], message: `duplicate key ${s.key}` });
      seen.add(s.key);
    });
  });

export class SuppressionsError extends Error {}

/** Parse and validate a suppressions file. Throws SuppressionsError with every problem listed. */
export function loadSuppressions(file: string): Suppression[] {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new SuppressionsError(`Could not read suppressions file ${file}: ${detail}`);
  }
  const parsed = suppressionsFileSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(file)"}: ${i.message}`);
    throw new SuppressionsError(`Invalid suppressions file ${file}:\n${problems.join("\n")}`);
  }
  return parsed.data.suppressions;
}

/** How the suppressions fared against the current scan. */
export interface SuppressionOutcome {
  /** Unexpired and matching a current defect: the defect is hidden from the gate. */
  active: Suppression[];
  /** Expired while the defect is still present: fails the gate. */
  expired: Suppression[];
  /** Match no current defect (fixed, or a typo). A warning, never a failure. */
  unmatched: Suppression[];
}

export function isExpired(s: Suppression, today: string): boolean {
  return s.expires < today;
}

/** Today in UTC as YYYY-MM-DD, the same zone `expires` is read in. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
