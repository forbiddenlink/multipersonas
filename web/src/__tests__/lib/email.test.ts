import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email";

const message = { to: "a@example.com", subject: "s", text: "t", html: "<p>t</p>", idempotencyKey: "k" };

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("SCAN_EMAIL_FROM", "Personaudit <scans@example.com>");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function body(): Record<string, unknown> {
    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  }

  it("sends List-Unsubscribe when the email has an unsubscribe page", async () => {
    await sendEmail({ ...message, unsubscribeUrl: "https://personaudit.com/projects/p1" });
    expect(body().headers).toEqual({ "List-Unsubscribe": "<https://personaudit.com/projects/p1>" });
  });

  it("sends no custom headers otherwise", async () => {
    await sendEmail(message);
    expect(body()).not.toHaveProperty("headers");
  });
});
