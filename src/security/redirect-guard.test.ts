import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import type { Browser } from "playwright";
import { launchAuditBrowser, isBrowserMissingError, BrowserMissingError } from "./browser.js";
import { guardedRoute, assertLandedUrlAllowed } from "./redirect-guard.js";

/**
 * SEC-003: context.route only sees the first URL of a redirect chain. Two local
 * servers stand in for "public" (allowed) and "private" (disallowed) hosts; the
 * verdict is injected so loopback can play both roles.
 */
let browser: Browser | null = null;
let skip = false;
const servers: http.Server[] = [];
const hits = { secret: 0, ok: 0 };
const pathHits = new Map<string, number>();

function listen(handler: http.RequestListener): Promise<number> {
  return new Promise((resolve) => {
    const s = http.createServer(handler).listen(0, "127.0.0.1", () => {
      servers.push(s);
      resolve((s.address() as AddressInfo).port);
    });
  });
}

let publicPort = 0;
let privatePort = 0;

beforeAll(async () => {
  privatePort = await listen((req, res) => {
    if (req.url === "/secret") hits.secret++;
    res.setHeader("content-type", "text/html");
    res.end("<html><body>SECRET-INTERNAL</body></html>");
  });
  publicPort = await listen((req, res) => {
    pathHits.set(req.url ?? "", (pathHits.get(req.url ?? "") ?? 0) + 1);
    res.setHeader("content-type", "text/html");
    if (req.url === "/redirect-private") {
      res.writeHead(302, { location: `http://127.0.0.1:${privatePort}/secret` });
      return res.end();
    }
    if (req.url === "/hop1") {
      res.writeHead(302, { location: "/redirect-private" });
      return res.end();
    }
    if (req.url === "/plain") {
      res.end("<html><body>PUBLIC-OK</body></html>");
      return;
    }
    if (req.url === "/redirect-ok") {
      res.writeHead(302, { location: "/ok" });
      return res.end();
    }
    hits.ok++;
    res.end("<html><body>PUBLIC-OK</body></html>");
  });
  try {
    browser = await launchAuditBrowser(
      process.env.PERSONAUDIT_TEST_CHROMIUM
        ? { executablePath: process.env.PERSONAUDIT_TEST_CHROMIUM }
        : {},
    );
  } catch (e) {
    // launchAuditBrowser wraps the launch failure, so match the wrapper too.
    if (!(e instanceof BrowserMissingError) && !isBrowserMissingError(e)) throw e;
    skip = true;
  }
});

afterAll(async () => {
  await browser?.close();
  for (const s of servers) s.close();
});

const isAllowed = async (url: string) => new URL(url).port !== String(privatePort);

async function visit(path: string): Promise<{ body: string; error: string | null }> {
  const context = await browser!.newContext();
  await context.route("**/*", guardedRoute(isAllowed));
  const page = await context.newPage();
  let error: string | null = null;
  try {
    await page.goto(`http://127.0.0.1:${publicPort}${path}`, { waitUntil: "domcontentloaded", timeout: 10_000 });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const body = error ? "" : await page.content();
  await context.close();
  return { body, error };
}

describe("redirect-aware request guard", () => {
  it("blocks a 302 from an allowed host to a disallowed one", async (ctx) => {
    if (skip) return ctx.skip();
    hits.secret = 0;
    const r = await visit("/redirect-private");
    expect(r.error).not.toBeNull();
    expect(r.body).not.toContain("SECRET-INTERNAL");
    expect(hits.secret).toBe(0);
  });

  it("blocks a multi-hop chain whose last hop is disallowed", async (ctx) => {
    if (skip) return ctx.skip();
    hits.secret = 0;
    const r = await visit("/hop1");
    expect(r.error).not.toBeNull();
    expect(hits.secret).toBe(0);
  });

  it("still follows a redirect whose every hop is allowed", async (ctx) => {
    if (skip) return ctx.skip();
    const r = await visit("/redirect-ok");
    expect(r.error).toBeNull();
    expect(r.body).toContain("PUBLIC-OK");
  });

  it("requests a non-redirect document exactly once at the origin", async (ctx) => {
    if (skip) return ctx.skip();
    pathHits.clear();
    const r = await visit("/plain");
    expect(r.error).toBeNull();
    expect(r.body).toContain("PUBLIC-OK");
    expect(pathHits.get("/plain")).toBe(1);
  });

  it("requests hop 1 of an allowed chain exactly once", async (ctx) => {
    if (skip) return ctx.skip();
    pathHits.clear();
    const r = await visit("/redirect-ok");
    expect(r.error).toBeNull();
    expect(pathHits.get("/redirect-ok")).toBe(1);
  });

  it("requests hop 1 of a blocked chain once and never loads the private target", async (ctx) => {
    if (skip) return ctx.skip();
    pathHits.clear();
    hits.secret = 0;
    await visit("/redirect-private");
    expect(pathHits.get("/redirect-private")).toBe(1);
    expect(hits.secret).toBe(0);
  });
});

describe("landed-url backstop", () => {
  it("rejects a final url the verdict disallows and accepts an allowed one", async () => {
    const deny = async (u: string) => !u.includes("169.254");
    await expect(assertLandedUrlAllowed({ url: () => "http://169.254.169.254/x" }, deny)).rejects.toThrow(/redirect/i);
    await expect(assertLandedUrlAllowed({ url: () => "https://example.com/" }, deny)).resolves.toBeUndefined();
  });
});
