/**
 * The database refuses a project insert past the owner's plan cap (trigger
 * `enforce_project_cap`, migration 20261004190000). It raises SQLSTATE `PA001` with
 * message `project_limit` and detail `limit=<n>`. This module is the one place that
 * knows that contract, so the app-level pre-check and the DB refusal show one message.
 */
export const PROJECT_LIMIT_SQLSTATE = "PA001";
export const PROJECT_LIMIT_CODE = "project_limit";

export class ProjectLimitError extends Error {
  /** The cap the database enforced, when it reported one. */
  readonly limit: number | null;
  constructor(limit: number | null) {
    super(PROJECT_LIMIT_CODE);
    this.name = "ProjectLimitError";
    this.limit = limit;
  }
}

/** Friendly copy for a plan at its project cap. Shared by every create path. */
export function projectLimitMessage(limit: number | null): string {
  if (limit === null) return "Your plan has reached its project limit. See pricing to add more.";
  return `Your plan includes ${limit} project${limit === 1 ? "" : "s"}. See pricing to add more.`;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
}

/** Map a supabase-js insert error to a ProjectLimitError, or null if it is anything else. */
export function toProjectLimitError(error: PostgrestLikeError): ProjectLimitError | null {
  if (error.code !== PROJECT_LIMIT_SQLSTATE && error.message !== PROJECT_LIMIT_CODE) return null;
  const parsed = /limit=(\d+)/.exec(error.details ?? "");
  return new ProjectLimitError(parsed ? Number(parsed[1]) : null);
}
