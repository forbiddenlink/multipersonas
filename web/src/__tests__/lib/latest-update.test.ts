import { describe, expect, it } from "vitest";
import { formatUpdateDate, shortenUpdate, latestUpdate } from "@/lib/latest-update";

describe("formatUpdateDate", () => {
  it("formats an ISO date as 'Mon D' without a timezone shift", () => {
    expect(formatUpdateDate("2026-10-28")).toBe("Oct 28");
    expect(formatUpdateDate("2026-01-01")).toBe("Jan 1");
    expect(formatUpdateDate("2026-12-31")).toBe("Dec 31");
  });
});

describe("shortenUpdate", () => {
  it("drops a leading 'New: ' label and the trailing period", () => {
    expect(shortenUpdate("New: personaudit mcp runs a local MCP server.")).toBe(
      "personaudit mcp runs a local MCP server",
    );
  });

  it("keeps the first clause when the sentence is long", () => {
    const text =
      "New: personaudit mcp runs a local MCP server, so a coding agent can scan a site and check it against your baseline before you review the change. Deterministic, no API key.";
    expect(shortenUpdate(text)).toBe("personaudit mcp runs a local MCP server");
  });

  it("cuts on a word boundary with an ellipsis when there is no usable comma", () => {
    const text = "One dead link no longer stops a CLI scan and the rest of the site is still scanned and reported cleanly";
    const out = shortenUpdate(text, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(out.slice(0, -1).endsWith(" ")).toBe(false);
    expect(text[out.length - 1]).toBe(" ");
  });

  it("leaves a short sentence alone", () => {
    expect(shortenUpdate("Reports now list broken links")).toBe("Reports now list broken links");
  });
});

describe("latestUpdate", () => {
  const entries = [{ date: "2026-10-28", text: "New: personaudit mcp runs a local MCP server, so a coding agent can scan a site and check it against your baseline before you review the change. Deterministic, no API key.", pr: 223 }];

  it("returns the date label and short text for the newest entry", () => {
    expect(latestUpdate(entries, new Date("2026-10-31T00:00:00Z"))).toEqual({
      date: "Oct 28",
      text: "personaudit mcp runs a local MCP server",
    });
  });

  it("shows the entry on day 90 and hides it on day 91 (UTC)", () => {
    expect(latestUpdate(entries, new Date("2027-01-26T23:59:59Z"))).not.toBeNull();
    expect(latestUpdate(entries, new Date("2027-01-27T00:00:00Z"))).toBeNull();
  });

  it("is not shifted by the clock's local day", () => {
    // 2026-10-28T23:30Z is still Oct 28 in UTC; age is 0 days.
    expect(latestUpdate(entries, new Date("2026-10-28T23:30:00Z"))).not.toBeNull();
  });

  it("returns null for an empty or malformed changelog", () => {
    expect(latestUpdate([], new Date())).toBeNull();
    expect(latestUpdate([{ date: "nope", text: "x", pr: 1 }], new Date())).toBeNull();
  });
});
