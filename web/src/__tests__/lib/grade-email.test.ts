import { describe, expect, it } from "vitest";
import { GRADE_EMAIL_LIMITS, canonicalMailbox, normalizeGradeEmail } from "@/lib/grade-email";
import { buildGradeEmail } from "@/lib/grade-email-template";
import { recipientKey } from "@/lib/grade-email-notify";

describe("normalizeGradeEmail", () => {
  it("trims and lowercases a plain address", () => {
    expect(normalizeGradeEmail("  Jane.Doe+grade@Example.COM ")).toBe("jane.doe+grade@example.com");
  });

  it.each([
    "",
    "no-at-sign.example.com",
    "two@@example.com",
    "a@b",
    "a@b.c",
    ".lead@example.com",
    "trail.@example.com",
    "dou..ble@example.com",
    "sp ace@example.com",
    "a@exa mple.com",
    "<script>@example.com",
    "a@-bad.example.com",
    "a@example..com",
    "a@example.123",
    "a@[127.0.0.1]",
    '"quoted"@example.com',
    "a@example.com\r\nBcc: victim@example.com",
    `${"x".repeat(65)}@example.com`,
    `a@${"x".repeat(250)}.com`,
  ])("rejects %j", (value) => {
    expect(normalizeGradeEmail(value)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(normalizeGradeEmail(undefined)).toBeNull();
    expect(normalizeGradeEmail(42)).toBeNull();
    expect(normalizeGradeEmail(["a@example.com"])).toBeNull();
  });
});

describe("abuse caps", () => {
  it("bound both the sender network and the recipient", () => {
    expect(GRADE_EMAIL_LIMITS.perCaller.max).toBeGreaterThanOrEqual(1);
    expect(GRADE_EMAIL_LIMITS.perRecipient.max).toBeGreaterThanOrEqual(1);
    // A recipient cap tighter than the caller cap is what protects a third party.
    expect(GRADE_EMAIL_LIMITS.perRecipient.max).toBeLessThanOrEqual(GRADE_EMAIL_LIMITS.perCaller.max);
    expect(GRADE_EMAIL_LIMITS.perCaller.windowSeconds).toBe(24 * 60 * 60);
  });

  it("keys the recipient cap by a hash, never the address", () => {
    const key = recipientKey("victim@example.com");
    expect(key).toMatch(/^gradeemail:to:[0-9a-f]{64}$/);
    expect(key).not.toContain("victim");
    expect(key).not.toContain("example.com");
    expect(recipientKey("victim@example.com")).toBe(key);
    expect(recipientKey("other@example.com")).not.toBe(key);
  });
});

describe("buildGradeEmail", () => {
  const permalink = "https://personaudit.com/grade/11111111-1111-4111-8111-111111111111";

  it("names the letter once in the subject, links the result once, and has one call to action", () => {
    const mail = buildGradeEmail({ host: "example.com", letter: "B", permalink });
    expect(mail.subject).toBe("example.com scored B on accessibility");
    expect(mail.text.split(permalink)).toHaveLength(2);
    expect(mail.html.match(/<a /g)).toHaveLength(1);
    expect(mail.text).toContain("It scored B");
  });

  it("explains a failed grade without inventing a letter", () => {
    const mail = buildGradeEmail({ host: "example.com", letter: null, permalink });
    expect(mail.subject).toBe("We could not finish grading example.com");
    expect(mail.text).not.toMatch(/scored/);
    expect(mail.text).toContain(permalink);
  });

  it("follows the copy rules: no em dashes, no conformance claims, no pushy words", () => {
    for (const letter of ["A", "F", null]) {
      const mail = buildGradeEmail({ host: "example.com", letter, permalink });
      for (const part of [mail.subject, mail.text, mail.html]) {
        expect(part).not.toContain("—");
        expect(part.toLowerCase()).not.toMatch(/complian|certif|guarantee|\bsimply\b|\bjust\b/);
      }
    }
  });

  it("escapes the host in html", () => {
    const mail = buildGradeEmail({ host: '<img src=x onerror=alert(1)>', letter: "A", permalink });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("tells the truth about retention", () => {
    const mail = buildGradeEmail({ host: "example.com", letter: "A", permalink });
    expect(mail.text).toMatch(/deleted your address/);
  });
});

describe("canonicalMailbox (quota identity, not delivery address)", () => {
  it("collapses Gmail dots, +tags and googlemail.com into one mailbox", () => {
    const variants = ["victim@gmail.com", "v.i.c.t.i.m@gmail.com", "victim+a@gmail.com", "vic.tim+zz@googlemail.com", "Victim@GMAIL.com"];
    const keys = new Set(variants.map((v) => canonicalMailbox(normalizeGradeEmail(v)!)));
    expect([...keys]).toEqual(["victim@gmail.com"]);
    const rk = new Set(variants.map((v) => recipientKey(normalizeGradeEmail(v)!)));
    expect(rk.size).toBe(1);
  });

  it("strips +tags only on providers that treat them as aliases, and keeps dots outside Gmail", () => {
    expect(canonicalMailbox("a.b+news@outlook.com")).toBe("a.b@outlook.com");
    expect(canonicalMailbox("a.b+news@example.com")).toBe("a.b+news@example.com");
    expect(canonicalMailbox("a.b@example.com")).not.toBe(canonicalMailbox("ab@example.com"));
  });

  it("keeps distinct mailboxes distinct and never changes the delivery address", () => {
    expect(canonicalMailbox("one@gmail.com")).not.toBe(canonicalMailbox("two@gmail.com"));
    expect(normalizeGradeEmail("V.ict+im@gmail.com")).toBe("v.ict+im@gmail.com");
  });
});
