import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadSuppressions, SuppressionsError, isExpired, todayUtc } from "./suppressions.js";

const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

function write(content: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-supp-"));
  dirs.push(dir);
  const file = path.join(dir, "s.json");
  fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
  return file;
}

const entry = { key: "color-contrast|#a", reason: "vendor widget", owner: "ana", expires: "2026-12-31" };

describe("loadSuppressions", () => {
  it("loads a valid file", () => {
    expect(loadSuppressions(write({ suppressions: [entry] }))).toEqual([entry]);
  });

  it.each(["reason", "owner", "expires", "key"] as const)("rejects a missing %s and names it", (field) => {
    const { [field]: _omit, ...rest } = entry;
    expect(() => loadSuppressions(write({ suppressions: [rest] }))).toThrow(new RegExp(`suppressions\\.0\\.${field}`));
  });

  it("rejects blank reason and owner", () => {
    expect(() => loadSuppressions(write({ suppressions: [{ ...entry, reason: "  ", owner: "" }] }))).toThrow(/reason[\s\S]*owner/);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => loadSuppressions(write({ suppressions: [{ ...entry, expires: "12/31/2026" }] }))).toThrow(/YYYY-MM-DD/);
    expect(() => loadSuppressions(write({ suppressions: [{ ...entry, expires: "2026-02-30" }] }))).toThrow(/real calendar date/);
  });

  it("rejects duplicate keys", () => {
    expect(() => loadSuppressions(write({ suppressions: [entry, entry] }))).toThrow(/duplicate key/);
  });

  it("rejects invalid JSON, a missing file, and a bare array", () => {
    expect(() => loadSuppressions(write("{nope"))).toThrow(SuppressionsError);
    expect(() => loadSuppressions("/nonexistent/s.json")).toThrow(SuppressionsError);
    expect(() => loadSuppressions(write([entry]))).toThrow(SuppressionsError);
  });
});

describe("expiry", () => {
  it("is inclusive of the expiry day and compares in UTC", () => {
    expect(isExpired(entry, "2026-12-31")).toBe(false);
    expect(isExpired(entry, "2027-01-01")).toBe(true);
    expect(todayUtc(new Date("2026-03-04T23:59:59Z"))).toBe("2026-03-04");
  });
});
