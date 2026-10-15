// Body of the one email a visitor asked for. Pure so the wording is testable.
// Copy rules: plain and honest, no em dashes, and no standards-conformance claims: this is
// an automated axe-core check, nothing more.

export interface GradeEmailInput {
  host: string;
  /** Null when the grade failed. */
  letter: string | null;
  /** Absolute /grade/<token> URL. This is the single call to action. */
  permalink: string;
}

export interface GradeEmailBody {
  subject: string;
  text: string;
  html: string;
}

const FOOTER =
  "This is an automated axe-core check of up to 10 public pages, so it cannot catch everything and is not a legal or standards statement.";
const PRIVACY =
  "You asked for this one email on personaudit.com. We deleted your address when we sent it and will not email you again.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildGradeEmail(input: GradeEmailInput): GradeEmailBody {
  const { host, letter, permalink } = input;
  const done = letter !== null;
  const subject = done
    ? `${host} scored ${letter} on accessibility`
    : `We could not finish grading ${host}`;
  const lead = done
    ? `The free accessibility grade for ${host} is ready. It scored ${letter}.`
    : `The free accessibility grade for ${host} did not finish, so there is no grade to show. The result page says what went wrong and lets you try again.`;
  const cta = done ? "See your grade" : "See what happened";

  const text = [lead, "", `${cta}: ${permalink}`, "", FOOTER, "", PRIVACY].join("\n");
  const html = [
    `<p>${escapeHtml(lead)}</p>`,
    `<p><a href="${escapeHtml(permalink)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:3px">${escapeHtml(cta)}</a></p>`,
    `<p style="color:#555;font-size:13px">${escapeHtml(FOOTER)}</p>`,
    `<p style="color:#555;font-size:13px">${escapeHtml(PRIVACY)}</p>`,
  ].join("\n");
  return { subject, text, html };
}
