import { describe, it, expect } from "vitest";
import { stripQuery, redactEmails, scrubEvent } from "@/lib/sentry-scrub";

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
