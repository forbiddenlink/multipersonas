import type { Request, Route } from "playwright";

/** Decides whether one URL may be requested. Same contract as assertRequestAllowed. */
export type RequestVerdict = (url: string, resourceType: string) => Promise<boolean>;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const MAX_REDIRECT_HOPS = 10;

/**
 * Playwright's `context.route` handler runs only for the FIRST url of a request.
 * When the response is a redirect the browser follows it internally and the handler
 * never sees the target, so `public.example -> 302 -> http://169.254.169.254/` would
 * load unvetted. For GET/HEAD navigations we therefore walk the redirect chain
 * ourselves (no redirect following, one vetted hop at a time) BEFORE letting the
 * browser load it, and abort if any hop is disallowed.
 *
 * Fails closed: a hop that cannot be fetched or a chain longer than
 * MAX_REDIRECT_HOPS is refused. Non-GET navigations (form POSTs) and subresources
 * are only checked at their first url; the egress proxy is the backstop there.
 */
async function redirectChainAllowed(
  route: Route,
  request: Request,
  isAllowed: RequestVerdict,
): Promise<boolean> {
  let url = request.url();
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    let status: number;
    let location: string | undefined;
    try {
      const response = await route.fetch({ url, maxRedirects: 0, timeout: 15_000 });
      status = response.status();
      location = response.headers()["location"];
    } catch {
      return false;
    }
    if (!REDIRECT_STATUSES.has(status) || !location) return true;
    let next: string;
    try {
      next = new URL(location, url).href;
    } catch {
      return false;
    }
    // Not "document": hops get the private-network check only. The on-origin scope rule
    // applies to the page the agent asked for, and apex <-> www redirects are legitimate.
    if (!(await isAllowed(next, "other"))) return false;
    url = next;
  }
  return false;
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
      if (!(await redirectChainAllowed(route, request, isAllowed))) {
        return route.abort("blockedbyclient");
      }
    }
    return route.continue();
  };
}
