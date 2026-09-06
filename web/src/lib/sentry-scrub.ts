// Redact app-specific PII before a Sentry event leaves the process. Personaudit captures
// user-submitted target URLs (query strings can carry tokens) plus emails (waitlist, auth).
// sendDefaultPii is off by default, but nothing scrubs these app-level fields — this does.
// Kept pure and loosely typed (the ErrorEvent shape differs across Sentry SDKs) so the
// nextjs client/server instrumentation can share one implementation; the worker keeps a
// parallel inline copy since it runs on @sentry/node in a separate package.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Drop the query string from a URL, keeping origin + path. Unchanged if there is none. */
export function stripQuery(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

/** Replace any email address in free text with a placeholder. */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_RE, "[email]");
}

/** Error strings can embed a target URL, including credentials or bearer tokens. */
function scrubText(text: string): string {
  const withoutUrlSecrets = text.replace(/https?:\/\/[^\s<>"']+/gi, (raw) => {
    try {
      const url = new URL(raw);
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return "[url]";
    }
  });
  return redactEmails(withoutUrlSecrets);
}

type ScrubbableEvent = {
  request?: { url?: string; query_string?: unknown; data?: unknown };
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
};

/**
 * Mutate + return a Sentry event with app PII removed: strip the request URL's query
 * string, drop the raw query_string and POST body, and redact emails from the message and
 * every exception value. Safe to call on any event (all fields optional).
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = stripQuery(event.request.url);
    }
    // Raw query string and POST body can carry the target URL's token or an email.
    if (event.request.query_string !== undefined) delete event.request.query_string;
    if (event.request.data !== undefined) delete event.request.data;
  }
  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }
  for (const value of event.exception?.values ?? []) {
    if (typeof value.value === "string") {
      value.value = scrubText(value.value);
    }
  }
  return event;
}
