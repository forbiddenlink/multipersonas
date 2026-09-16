import { describe, expect, it } from "vitest";
import {
  composeWaitlistNote,
  isFollowUpStatus,
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

  it("keeps campaign context structured and bounded without accepting arbitrary source text", () => {
    expect(
      composeWaitlistNote({
        attribution: { campaign: "fall-launch", referrerHost: "example.org" },
      }),
    ).toBe("Campaign: fall-launch. Referred by: example.org");
    expect(composeWaitlistNote({ attribution: { campaign: "x".repeat(65) } })).toBeUndefined();
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

  it("reads attribution labels back for demand analysis", () => {
    const note = composeWaitlistNote({
      attribution: { campaign: "fall-launch", referrerHost: "example.org" },
    });
    expect(parseWaitlistSignals(note)).toEqual({
      campaign: "fall-launch",
      referrerHost: "example.org",
    });
  });

  it("returns empty on free-text-only notes", () => {
    expect(parseWaitlistSignals("just email me")).toEqual({});
    expect(parseWaitlistSignals(null)).toEqual({});
  });
});

describe("isFollowUpStatus", () => {
  it("accepts only the owner workflow states", () => {
    expect(isFollowUpStatus("qualified")).toBe(true);
    expect(isFollowUpStatus("converted")).toBe(true);
    expect(isFollowUpStatus("contacted twice")).toBe(false);
  });
});
