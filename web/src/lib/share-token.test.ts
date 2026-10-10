import { describe, expect, it } from "vitest";
import {
  SHARE_LINK_DEFAULT_DAYS,
  SHARE_TOKEN_LENGTH,
  defaultShareExpiry,
  generateShareToken,
  isShareTokenShape,
  shareState,
} from "./share-token";

describe("generateShareToken", () => {
  it("is 43 url-safe characters (32 random bytes, base64url, no padding)", () => {
    const token = generateShareToken();
    expect(token).toHaveLength(SHARE_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isShareTokenShape(token)).toBe(true);
  });

  it("decodes back to 32 bytes", () => {
    expect(Buffer.from(generateShareToken(), "base64url")).toHaveLength(32);
  });

  it("does not repeat across many draws", () => {
    const tokens = new Set(Array.from({ length: 2000 }, generateShareToken));
    expect(tokens.size).toBe(2000);
  });
});

describe("isShareTokenShape", () => {
  it("rejects wrong lengths, bad characters, and non-strings", () => {
    expect(isShareTokenShape("short")).toBe(false);
    expect(isShareTokenShape("A".repeat(44))).toBe(false);
    expect(isShareTokenShape(`${"A".repeat(42)}=`)).toBe(false);
    expect(isShareTokenShape(`${"A".repeat(42)}/`)).toBe(false);
    expect(isShareTokenShape(null)).toBe(false);
    expect(isShareTokenShape(undefined)).toBe(false);
    expect(isShareTokenShape(42)).toBe(false);
  });
});

describe("defaultShareExpiry", () => {
  it("is 30 days out", () => {
    expect(SHARE_LINK_DEFAULT_DAYS).toBe(30);
    const now = new Date("2026-10-10T00:00:00Z");
    expect(defaultShareExpiry(now).toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });
});

describe("shareState", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const token = "A".repeat(43);

  it("is none without a token", () => {
    expect(shareState({ share_token: null, share_expires_at: null, share_revoked_at: null }, now)).toBe("none");
  });

  it("is active before expiry and not revoked", () => {
    expect(
      shareState({ share_token: token, share_expires_at: "2026-10-11T00:00:00Z", share_revoked_at: null }, now),
    ).toBe("active");
  });

  it("is expired at or after the expiry instant", () => {
    expect(
      shareState({ share_token: token, share_expires_at: "2026-10-10T12:00:00Z", share_revoked_at: null }, now),
    ).toBe("expired");
    expect(
      shareState({ share_token: token, share_expires_at: "2026-10-01T00:00:00Z", share_revoked_at: null }, now),
    ).toBe("expired");
  });

  it("treats a token with no expiry as expired, matching the database", () => {
    expect(shareState({ share_token: token, share_expires_at: null, share_revoked_at: null }, now)).toBe("expired");
  });

  it("is revoked even when the expiry is still in the future", () => {
    expect(
      shareState(
        { share_token: token, share_expires_at: "2026-10-11T00:00:00Z", share_revoked_at: "2026-10-10T08:00:00Z" },
        now,
      ),
    ).toBe("revoked");
  });
});
