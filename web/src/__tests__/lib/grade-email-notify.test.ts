import { beforeEach, describe, expect, it, vi } from "vitest";

const captureMessage = vi.fn();
const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureMessage: (...a: unknown[]) => captureMessage(...a),
  captureException: (...a: unknown[]) => captureException(...a),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => null) }));

import {
  captureGradeEmail,
  isMissingMigration,
  sendGradeEmail,
  sweepGradeEmails,
  type GradeEmailDeps,
} from "@/lib/grade-email-notify";

const TOKEN = "11111111-1111-4111-8111-111111111111";
const ADDRESS = "visitor@example.com";

function fakeStore() {
  // Models the database contract: one address, leased on claim, erased on a successful finish.
  const state = { email: ADDRESS as string | null, sent: false, leased: false, finished: [] as boolean[], refunded: false };
  const deps: GradeEmailDeps = {
    origin: "https://personaudit.com",
    async claim() {
      if (!state.email || state.sent || state.leased) return null;
      state.leased = true;
      return state.email;
    },
    async finish(_t, sent, options) {
      state.finished.push(sent);
      state.refunded = options?.refund === true;
      state.leased = false;
      if (sent) {
        state.sent = true;
        state.email = null;
      }
    },
    getScan: vi.fn(async () => ({ entryUrl: "https://example.com/", letter: "B" as string | null, terminal: true })),
    send: vi.fn(async () => ({ ok: true as const })),
  };
  return { state, deps };
}

beforeEach(() => vi.clearAllMocks());

describe("sendGradeEmail", () => {
  it("sends once to the claimed address with the permalink, then erases it", async () => {
    const { state, deps } = fakeStore();
    expect(await sendGradeEmail(deps, TOKEN)).toBe("sent");
    expect(deps.send).toHaveBeenCalledTimes(1);
    const message = vi.mocked(deps.send).mock.calls[0]![0];
    expect(message.to).toBe(ADDRESS);
    expect(message.text).toContain(`https://personaudit.com/grade/${TOKEN}`);
    expect(message.subject).toContain("scored B");
    expect(message.idempotencyKey).toBe(`grade-email-${TOKEN}`);
    expect(state.email).toBeNull();
    expect(state.finished).toEqual([true]);
  });

  it("never sends a second time for the same grade", async () => {
    const { deps } = fakeStore();
    await sendGradeEmail(deps, TOKEN);
    expect(await sendGradeEmail(deps, TOKEN)).toBe("skipped");
    expect(await sendGradeEmail(deps, TOKEN)).toBe("skipped");
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("two concurrent callers produce one email", async () => {
    const { deps } = fakeStore();
    const outcomes = await Promise.all([sendGradeEmail(deps, TOKEN), sendGradeEmail(deps, TOKEN)]);
    expect(outcomes.sort()).toEqual(["sent", "skipped"]);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when no one asked", async () => {
    const { state, deps } = fakeStore();
    state.email = null;
    expect(await sendGradeEmail(deps, TOKEN)).toBe("skipped");
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("keeps the address and releases the lease when the provider fails, without leaking it", async () => {
    const { state, deps } = fakeStore();
    vi.mocked(deps.send).mockResolvedValueOnce({ ok: false, error: "Resend responded 500" });
    expect(await sendGradeEmail(deps, TOKEN)).toBe("failed");
    expect(state.email).toBe(ADDRESS);
    expect(state.leased).toBe(false);
    expect(state.finished).toEqual([false]);
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain(ADDRESS);
    // The next attempt can send.
    expect(await sendGradeEmail(deps, TOKEN)).toBe("sent");
  });

  it("releases the lease and reports without the address when something throws", async () => {
    const { state, deps } = fakeStore();
    vi.mocked(deps.getScan).mockRejectedValueOnce(new Error("db down"));
    expect(await sendGradeEmail(deps, TOKEN)).toBe("failed");
    expect(state.leased).toBe(false);
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(ADDRESS);
  });

  it("emails a failed grade as a failure notice with no letter", async () => {
    const { deps } = fakeStore();
    vi.mocked(deps.getScan).mockResolvedValueOnce({ entryUrl: "https://example.com/", letter: null, terminal: true });
    await sendGradeEmail(deps, TOKEN);
    expect(vi.mocked(deps.send).mock.calls[0]![0].subject).toBe("We could not finish grading example.com");
  });

  it("releases the claim and sends nothing if the grade vanished", async () => {
    const { state, deps } = fakeStore();
    vi.mocked(deps.getScan).mockResolvedValueOnce(null);
    expect(await sendGradeEmail(deps, TOKEN)).toBe("skipped");
    expect(deps.send).not.toHaveBeenCalled();
    expect(state.finished).toEqual([false]);
  });
});

describe("completion race", () => {
  it("does not send a failure notice, or consume the claim, while the grade is still running", async () => {
    const { state, deps } = fakeStore();
    vi.mocked(deps.getScan).mockResolvedValueOnce({ entryUrl: "https://example.com/", letter: null, terminal: false });
    expect(await sendGradeEmail(deps, TOKEN)).toBe("skipped");
    expect(deps.send).not.toHaveBeenCalled();
    expect(state.email).toBe(ADDRESS);
    expect(state.refunded).toBe(true);
    expect(state.leased).toBe(false);
    // Once it is really done, it sends.
    expect(await sendGradeEmail(deps, TOKEN)).toBe("sent");
  });
});

describe("retry window", () => {
  it("sends an identical payload on every retry, keyed by the grade token", async () => {
    const { deps } = fakeStore();
    vi.mocked(deps.send).mockResolvedValueOnce({ ok: false, error: "Resend responded 500" });
    await sendGradeEmail(deps, TOKEN);
    await sendGradeEmail(deps, TOKEN);
    const [a, b] = vi.mocked(deps.send).mock.calls.map(([m]) => m);
    expect(a).toEqual(b);
    expect(a!.idempotencyKey).toContain(TOKEN);
  });

  it("keys an uppercase token the same as the lowercase one the sweep reads", async () => {
    const { deps } = fakeStore();
    vi.mocked(deps.send).mockResolvedValueOnce({ ok: false, error: "ack lost" });
    const lower = "abcdef12-3456-4789-8abc-def012345678";
    await sendGradeEmail(deps, lower.toUpperCase());
    await sendGradeEmail(deps, lower);
    const [a, b] = vi.mocked(deps.send).mock.calls.map(([m]) => m);
    expect(a).toEqual(b);
  });
});

describe("sweepGradeEmails", () => {
  it("prunes first, then sends each pending grade once", async () => {
    const { deps } = fakeStore();
    const order: string[] = [];
    const sweepDeps = {
      ...deps,
      prune: async () => void order.push("prune"),
      listPending: async () => {
        order.push("list");
        return [TOKEN, TOKEN];
      },
    };
    const result = await sweepGradeEmails(sweepDeps);
    expect(order).toEqual(["prune", "list"]);
    expect(result).toEqual({ sent: 1, skipped: 1, failed: 0 });
  });
});

describe("captureGradeEmail", () => {
  const rpcOk = (data: unknown) => ({ rpc: vi.fn(async () => ({ data, error: null })) });

  it("passes the caller cap, a hashed recipient cap and a 24 hour window", async () => {
    const db = rpcOk("saved");
    expect(await captureGradeEmail(db, { token: TOKEN, email: ADDRESS, ip: "203.0.113.9" })).toBe("saved");
    const [fn, args] = db.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fn).toBe("request_grade_email");
    expect(args).toMatchObject({
      p_token: TOKEN,
      p_ip_key: "gradeemail:ip:203.0.113.9",
      p_ip_max: 5,
      p_to_max: 3,
      p_window_seconds: 86400,
    });
    expect(String(args.p_to_key)).not.toContain("visitor");
  });

  it.each(["saved", "exists", "not_found", "expired", "rate_limited"] as const)("passes %s through", async (status) => {
    expect(await captureGradeEmail(rpcOk(status), { token: TOKEN, email: ADDRESS, ip: "ip" })).toBe(status);
  });

  it("treats an unapplied migration as unavailable, quietly", async () => {
    const db = { rpc: vi.fn(async () => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } })) };
    expect(await captureGradeEmail(db, { token: TOKEN, email: ADDRESS, ip: "ip" })).toBe("unavailable");
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("reports any other database error without the address", async () => {
    const db = { rpc: vi.fn(async () => ({ data: null, error: { code: "XX000", message: `boom for ${ADDRESS}` } })) };
    expect(await captureGradeEmail(db, { token: TOKEN, email: ADDRESS, ip: "ip" })).toBe("unavailable");
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain(ADDRESS);
  });

  it("never throws", async () => {
    const db = { rpc: vi.fn(async () => { throw new Error(ADDRESS); }) };
    expect(await captureGradeEmail(db, { token: TOKEN, email: ADDRESS, ip: "ip" })).toBe("unavailable");
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain(ADDRESS);
  });

  it("does not echo an unexpected status", async () => {
    expect(await captureGradeEmail(rpcOk("weird"), { token: TOKEN, email: ADDRESS, ip: "ip" })).toBe("unavailable");
  });
});

describe("isMissingMigration", () => {
  it("recognises the missing-function and missing-table shapes", () => {
    expect(isMissingMigration({ code: "42883", message: "x" })).toBe(true);
    expect(isMissingMigration({ code: "42P01", message: "x" })).toBe(true);
    expect(isMissingMigration({ message: "Could not find the function public.claim_grade_email" })).toBe(true);
    expect(isMissingMigration({ code: "23505", message: "duplicate" })).toBe(false);
    expect(isMissingMigration(null)).toBe(false);
  });
});
