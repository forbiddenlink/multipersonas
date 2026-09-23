// Shared error-event scrubbing for the web app and worker.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Remove URL credentials, query strings, fragments, and private result tokens. */
export function stripQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/^\/grade\/[^/]+/, "/grade/[token]");
    return parsed.toString();
  } catch {
    if (/^https?:/i.test(url)) return "[url]";
    return url.split(/[?#]/)[0]?.replace(/^\/grade\/[^/]+/, "/grade/[token]") ?? "";
  }
}

/** Replace any email address in free text with a placeholder. */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_RE, "[email]");
}

/** Error strings can embed a target URL, including credentials or bearer tokens. */
function scrubText(text: string): string {
  const withoutUrlSecrets = text.replace(/https?:\/\/[^\s<>"']+/gi, (raw) => {
    return stripQuery(raw);
  });
  return redactEmails(withoutUrlSecrets);
}

type ScrubbableEvent = {
  request?: { url?: string; query_string?: unknown; data?: unknown; headers?: unknown; cookies?: unknown };
  user?: unknown;
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
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
    delete event.request.headers;
    delete event.request.cookies;
  }
  delete event.user;
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === "string") breadcrumb.message = scrubText(breadcrumb.message);
    if (breadcrumb.data) {
      const data: Record<string, unknown> = {};
      for (const key of ["url", "from", "to"]) {
        const value = breadcrumb.data[key];
        if (typeof value === "string") data[key] = redactEmails(stripQuery(value));
      }
      if (typeof breadcrumb.data.status_code === "number") data.status_code = breadcrumb.data.status_code;
      breadcrumb.data = data;
    }
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
