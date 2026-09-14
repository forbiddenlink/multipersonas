import { describe, expect, it } from "vitest";
import {
  composeWaitlistNote,
  parseWaitlistSignals,
  WAITLIST_NOTE_MAX,
} from "@/lib/waitlist-note";

describe("composeWaitlistNote", () => {
  it("returns undefined when nothing was answered", () => {
    expect(composeWaitlistNote({})).toBeUndefined();
    expect(composeWaitlistNote({ authNeed: "", scanPref: "", note: "  " })).toBeUndefined();
  });

  it("ignores values outside the demand-test enums", () => {
    expect(composeWaitlistNote({ authNeed: "lots", scanPref: "maybe" })).toBeUndefined();
  });

  it("encodes Auth need and scan preference in a form the admin page can count", () => {
    expect(
      composeWaitlistNote({
        authNeed: "most",
        scanPref: "local",
        note: "checkout and account dashboards",
      }),
    ).toBe("Auth need: most behind login. Prefer: local CLI. checkout and account dashboards");
  });

  it("stays inside the waitlist note cap", () => {
    const composed = composeWaitlistNote({
      authNeed: "all",
      scanPref: "hosted",
      note: "x".repeat(WAITLIST_NOTE_MAX),
    });
    expect(composed?.length).toBeLessThanOrEqual(WAITLIST_NOTE_MAX);
  });
});

describe("parseWaitlistSignals", () => {
  it("reads the labels back off a composed note", () => {
    const note = composeWaitlistNote({
      authNeed: "some",
      scanPref: "unsure",
      note: "we'll ask the client",
    });
    expect(parseWaitlistSignals(note)).toEqual({
      authNeed: "some behind login",
      scanPref: "unsure",
    });
  });

  it("returns empty on free-text-only notes", () => {
    expect(parseWaitlistSignals("just email me")).toEqual({});
    expect(parseWaitlistSignals(null)).toEqual({});
  });
});
