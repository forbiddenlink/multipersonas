import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolveSessionFile, looksLikeLogin, SessionError } from "./session.js";

/**
 * A session file holds live cookies. Anything that can read it can act as the
 * user, so these pin the handling rules, not just the happy path.
 */
let dir: string;
const write = (name: string, body: string, mode = 0o600) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, body, { mode });
  fs.chmodSync(p, mode);
  return p;
};
const valid = JSON.stringify({ cookies: [{ name: "session", value: "x" }], origins: [] });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "mp-session-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("resolveSessionFile", () => {
  it("accepts a well-formed, private session file", () => {
    const p = write("ok.json", valid);
    expect(resolveSessionFile(p)).toBe(p);
  });

  it("refuses a session other users can read", () => {
    const p = write("loose.json", valid, 0o644);
    expect(() => resolveSessionFile(p)).toThrow(SessionError);
    expect(() => resolveSessionFile(p)).toThrow(/readable by other users/);
  });

  it("refuses a group-readable session", () => {
    const p = write("group.json", valid, 0o640);
    expect(() => resolveSessionFile(p)).toThrow(/readable by other users/);
  });

  it("names the fix when the file is missing", () => {
    expect(() => resolveSessionFile(path.join(dir, "nope.json"))).toThrow(/mpersonas auth/);
  });

  it("refuses an empty session rather than running logged out", () => {
    // A logged-out run is worse than no run: it audits the login page and bills
    // for a report about it.
    const p = write("empty.json", JSON.stringify({ cookies: [], origins: [] }));
    expect(() => resolveSessionFile(p)).toThrow(/no login was captured/);
  });

  it("refuses malformed or non-session JSON", () => {
    expect(() => resolveSessionFile(write("bad.json", "{not json"))).toThrow(/not valid JSON/);
    expect(() => resolveSessionFile(write("wrong.json", JSON.stringify({ token: "x" })))).toThrow(/not a session/);
  });
});

describe("looksLikeLogin — warn-only heuristic", () => {
  it("spots the wall the 2026-07-15 dogfood run died on", () => {
    expect(looksLikeLogin("http://localhost:3000/auth/login?redirect=%2F", "Sign in")).toBe(true);
  });

  it("spots common variants", () => {
    expect(looksLikeLogin("https://x.com/signin", "")).toBe(true);
    expect(looksLikeLogin("https://x.com/", "Log-in required")).toBe(true);
    expect(looksLikeLogin("https://sso.example.com/auth/realms", "")).toBe(true);
  });

  it("does not flag ordinary application pages", () => {
    expect(looksLikeLogin("http://localhost:3010/browse/databases", "Browse data")).toBe(false);
    expect(looksLikeLogin("https://shop.example.com/checkout", "Checkout")).toBe(false);
  });
});
