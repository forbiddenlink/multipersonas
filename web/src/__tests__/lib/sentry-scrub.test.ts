import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  stripQuery,
  redactEmails,
  scrubEvent,
  carriesShareToken,
  scrubTransaction,
  sharedReportSafeSampler,
} from "@/lib/sentry-scrub";

/**
 * Fastest of several runs. A linear regex stays far under budget on every run, while
 * catastrophic backtracking is slow on every run, so the minimum keeps the check
 * meaningful but stops one CI load spike from failing it.
 */
function fastestRunMs(fn: () => unknown, runs = 5): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe("wiring", () => {
  it("PostHog skips init and drops events on share links; Sentry samples and scrubs", () => {
    const read = (f: string) => fs.readFileSync(`${process.cwd()}/src/${f}`, "utf8");
    const ph = read("lib/posthog-client.ts");
    expect(ph).toMatch(/if \(carriesShareToken\(window\.location\.pathname\)\) return Promise\.resolve\(null\)/);
    expect(ph).toMatch(/if \(carriesShareToken\(event\)\) return null/);
    // The browser SDK is initialised lazily in lib/sentry-lazy.ts, not in instrumentation-client.ts.
    for (const f of ["instrumentation.ts", "lib/sentry-lazy.ts"]) {
      const src = read(f);
      expect(src).toContain("sharedReportSafeSampler(0.1)");
      expect(src).toContain("beforeSendTransaction");
    }
  });
});

describe("stripQuery", () => {
  it("drops the query string, keeps origin+path", () => {
    expect(stripQuery("https://x.com/a/b?token=secret&e=a@b.com")).toBe("https://x.com/a/b");
  });
  it("leaves a query-less URL unchanged", () => {
    expect(stripQuery("https://x.com/a")).toBe("https://x.com/a");
  });
});

describe("redactEmails", () => {
  it("replaces emails with a placeholder", () => {
    expect(redactEmails("failed for user liz@example.com now")).toBe("failed for user [email] now");
  });
});

describe("scrubEvent", () => {
  it("strips request query + drops query_string and POST body", () => {
    const e = scrubEvent({
      request: { url: "https://s.com/api/audit?token=abc", query_string: "token=abc", data: { email: "a@b.com" } },
    });
    expect(e.request?.url).toBe("https://s.com/api/audit");
    expect(e.request?.query_string).toBeUndefined();
    expect(e.request?.data).toBeUndefined();
  });

  it("redacts emails in message + exception values", () => {
    const e = scrubEvent({
      message: "signup failed for a@b.com",
      exception: { values: [{ value: "duplicate key for c@d.io" }] },
    });
    expect(e.message).toBe("signup failed for [email]");
    expect(e.exception?.values?.[0]?.value).toBe("duplicate key for [email]");
  });

  it("removes URL credentials, query tokens and fragments from error text", () => {
    const e = scrubEvent({
      message: "Failed https://user:synthetic-password@example.invalid/path?token=synthetic#private",
      exception: { values: [{ value: "Fetch https://example.invalid/path?token=synthetic failed" }] },
    });
    expect(e.message).toBe("Failed https://example.invalid/path");
    expect(e.exception?.values?.[0]?.value).toBe("Fetch https://example.invalid/path failed");
  });

  it("is safe on an empty event", () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});

it("removes credentials and private result tokens from requests and breadcrumbs", () => {
  const event = scrubEvent({
    request: { url: "https://synthetic:password@example.com/grade/private?key=secret#fragment", headers: { authorization: "synthetic" }, cookies: "synthetic" },
    user: { email: "synthetic@example.com" },
    breadcrumbs: [{ message: "Failed https://example.com/path?key=secret", data: { url: "https://example.com/path?key=secret", to: "/grade/private#fragment", status_code: 500, arguments: ["synthetic secret"], body: "synthetic secret" } }],
  });
  expect(event.request).toEqual({ url: "https://example.com/grade/[token]" });
  expect(event.user).toBeUndefined();
  expect(event.breadcrumbs).toEqual([{ message: "Failed https://example.com/path", data: { url: "https://example.com/path", to: "/grade/[token]", status_code: 500 } }]);
});

it("does not return malformed absolute URLs containing credentials", () => {
  expect(stripQuery("https://synthetic:password@[invalid")).toBe("[url]");
});

describe("share token never reaches analytics or tracing", () => {
  const token = "A".repeat(43);
  const sdkPayload = {
    event: "$pageview",
    properties: {
      $current_url: `https://x.test/r/${token}`,
      $initial_current_url: `https://x.test/r/${token}`,
      $session_entry_url: `https://x.test/r/${token}`,
      $pathname: `/r/${token}`,
      $set_once: { $initial_referrer: "$direct", $initial_current_url: `https://x.test/r/${token}` },
    },
  };

  it("detects a token in any property of an SDK-shaped payload", () => {
    expect(carriesShareToken(sdkPayload)).toBe(true);
    expect(carriesShareToken({ properties: { $current_url: "https://x.test/dashboard" } })).toBe(false);
    expect(carriesShareToken(`/r/${token}`)).toBe(true);
  });

  it("redacts every occurrence in a transaction with spans", () => {
    const tx = {
      transaction: `GET /r/${token}`,
      request: { url: `https://x.test/r/${token}` },
      spans: [{ description: `fetch /r/${token}`, data: { "url.full": `https://x.test/r/${token}`, "url.path": `/r/${token}` } }],
    };
    expect(JSON.stringify(scrubTransaction(tx))).not.toContain(token);
  });

  it("samples share link requests at 0 and others at the base rate", () => {
    const sampler = sharedReportSafeSampler(0.1);
    expect(sampler({ name: `GET /r/${token}` })).toBe(0);
    expect(sampler({ name: "GET /x", attributes: { "url.path": `/r/${token}` } })).toBe(0);
    expect(sampler({ name: "GET /dashboard", attributes: { "url.path": "/dashboard" } })).toBe(0.1);
  });
});

it("redacts report share tokens from paths", () => {
  const token = "A".repeat(43);
  expect(stripQuery(`https://example.com/r/${token}?x=1`)).toBe("https://example.com/r/[token]");
  expect(stripQuery(`/r/${token}#frag`)).toBe("/r/[token]");
});

describe("redactEmails cost", () => {
  it("stays linear on a long run of local-part characters with no @", () => {
    // CodeQL js/polynomial-redos: the unanchored local part retried from every
    // offset, so 50k chars of "a." took seconds inside beforeSend.
    const input = "a.".repeat(25_000) + "@";
    // Generous budget: guards against pathological blowup, not micro-performance; tight budgets flake on the shared CI runner.
    expect(fastestRunMs(() => redactEmails(input))).toBeLessThan(1000);
  });

  it("redacts an address whose local part and domain exceed RFC lengths", () => {
    const long = `${"x".repeat(200)}@${"d".repeat(300)}.com`;
    expect(redactEmails(`to ${long} now`)).toBe("to [email] now");
  });

  it("stays linear when the domain run is long and has no TLD", () => {
    const input = "a@" + "b.".repeat(25_000);
    // Generous budget: guards against pathological blowup, not micro-performance; tight budgets flake on the shared CI runner.
    expect(fastestRunMs(() => redactEmails(input))).toBeLessThan(1000);
  });

  it("still redacts addresses next to punctuation", () => {
    expect(redactEmails("(jane.doe+x@example.co.uk), bob@a.io.")).toBe("([email]), [email].");
  });
});
