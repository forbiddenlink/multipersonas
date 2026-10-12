import type { Request, Route } from "playwright";

/** Decides whether one URL may be requested. Same contract as assertRequestAllowed. */
export type RequestVerdict = (url: string, resourceType: string) => Promise<boolean>;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const MAX_REDIRECT_HOPS = 10;

function redirectTarget(status: number, headers: Record<string, string>, from: string): string | null | undefined {
  // undefined: not a redirect. null: a redirect we cannot resolve (refuse it).
  const location = headers["location"];
  if (!REDIRECT_STATUSES.has(status) || !location) return undefined;
  try {
    return new URL(location, from).href;
  } catch {
    return null;
  }
}

/**
 * Playwright's `context.route` handler runs only for the FIRST url of a request.
 * Chromium does not route the follow-up of a redirect we fulfill either (verified on
 * Chromium 153 / Playwright 1.62.1), so `public.example -> 302 -> http://169.254.169.254/`
 * would load unvetted. For GET/HEAD navigations the handler therefore fetches hop 1
 * itself (route.fetch honors the launch proxy) and:
 *
 * - not a redirect: fulfills with that response. One network request in total.
 * - a redirect: walks hops 2..n with fetch (no redirect following, private-network
 *   rule only, MAX_REDIRECT_HOPS cap, fail closed), and if every hop is allowed
 *   fulfills with hop 1's 3xx so Chromium follows it.
 *
 * Residual: hop 1 is requested once (magic-link and token URLs live there), but hops
 * 2..n are requested twice, once by this walk and once by Chromium, because Chromium
 * does not route the follow-up of a fulfilled 3xx. Form POSTs and subresources are only
 * checked at their first url; assertLandedUrlAllowed and the egress proxy are the
 * backstops there.
 */
async function handleNavigation(route: Route, request: Request, isAllowed: RequestVerdict): Promise<void> {
  let first;
  try {
    first = await route.fetch({ maxRedirects: 0, timeout: 15_000 });
  } catch {
    return route.abort("blockedbyclient");
  }

  let next = redirectTarget(first.status(), first.headers(), request.url());
  if (next === undefined) return route.fulfill({ response: first });

  for (let hop = 1; hop <= MAX_REDIRECT_HOPS; hop++) {
    // Not "document": hops get the private-network check only. The on-origin scope rule
    // applies to the page the agent asked for, and apex <-> www redirects are legitimate.
    if (next === null || !(await isAllowed(next, "other"))) return route.abort("blockedbyclient");
    let status: number;
    let headers: Record<string, string>;
    try {
      const response = await route.fetch({ url: next, maxRedirects: 0, timeout: 15_000 });
      status = response.status();
      headers = response.headers();
    } catch {
      return route.abort("blockedbyclient");
    }
    const after = redirectTarget(status, headers, next);
    if (after === undefined) return route.fulfill({ response: first });
    next = after;
  }
  return route.abort("blockedbyclient");
}

/**
 * Route handler for `context.route("**\/*", ...)`: vets the request, and for GET
 * navigations every redirect hop after it, before it is allowed to load.
 */
export function guardedRoute(isAllowed: RequestVerdict) {
  return async (route: Route, request: Request): Promise<void> => {
    const type = request.resourceType();
    if (!(await isAllowed(request.url(), type))) {
      return route.abort("blockedbyclient");
    }
    const method = request.method();
    if (type === "document" && (method === "GET" || method === "HEAD")) {
      return handleNavigation(route, request, isAllowed);
    }
    return route.continue();
  };
}

/**
 * Backstop for the cases guardedRoute cannot see (POST navigations, client-side
 * redirects): after a navigation, the url the page ended on must pass the same
 * private-network rule. Throws so callers treat it as a failed navigation.
 */
export async function assertLandedUrlAllowed(
  page: { url(): string },
  isAllowed: RequestVerdict,
): Promise<void> {
  const url = page.url();
  if (!(await isAllowed(url, "other"))) {
    throw new Error("Navigation ended on a disallowed address after a redirect.");
  }
}
