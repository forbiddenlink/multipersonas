// Shared error-event scrubbing for the web app and worker.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Private result tokens live in the path: grade results and report share links. */
function redactTokenPath(pathname: string): string {
  return pathname
    .replace(/^\/grade\/[^/]+/, "/grade/[token]")
    .replace(/^\/r\/[^/]+/, "/r/[token]");
}

/** Remove URL credentials, query strings, fragments, and private result tokens. */
export function stripQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = redactTokenPath(parsed.pathname);
    return parsed.toString();
  } catch {
    if (/^https?:/i.test(url)) return "[url]";
    return redactTokenPath(url.split(/[?#]/)[0] ?? "");
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

// Report share links put a bearer token in the path (/r/<token>). Analytics and tracing
// carry URLs in many properties (session entry URLs, span attributes, transaction names),
// so these helpers work on whole payloads instead of a fixed list of keys.
const SHARE_PATH_RE = /\/r\/[^/\s?#"'\\]+/g;
const MAX_DEPTH = 12;

/** True when any string anywhere in the value contains a /r/<token> path. */
export function carriesShareToken(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return /\/r\/[^/\s?#"'\\]+/.test(value);
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((v) => carriesShareToken(v, depth + 1));
}

/** Replace every /r/<token> path in every string, in place on a copy. */
export function redactShareTokens<T>(value: T, depth = 0): T {
  if (typeof value === "string") return value.replace(SHARE_PATH_RE, "/r/[token]") as T;
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactShareTokens(v, depth + 1)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = redactShareTokens(v, depth + 1);
  }
  return out as T;
}

/** Transactions and spans: scrub URLs the error scrubber never sees. */
export function scrubTransaction<T extends object>(event: T): T {
  return redactShareTokens(event);
}

/** Never trace a share-link request; otherwise sample at `rate`. */
export function sharedReportSafeSampler(rate: number) {
  return (ctx: { name?: string; attributes?: Record<string, unknown>; normalizedRequest?: { url?: string } }): number =>
    carriesShareToken([ctx.name, ctx.normalizedRequest?.url, ctx.attributes]) ? 0 : rate;
}
