// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

interface Job {
  status: "queued" | "running";
  created_at: string;
  started_at: string;
}

const base = new Date("2026-09-29T12:00:00Z");
let now = base;
let jobs: Job[];
const databaseFetch = vi.fn<typeof fetch>();

function job(status: Job["status"], ageMinutes: number): Job {
  const timestamp = new Date(now.getTime() - ageMinutes * 60_000).toISOString();
  return { status, created_at: timestamp, started_at: timestamp };
}

function authed(secret = "test-cron-secret"): Request {
  return new Request("http://localhost/api/health", { headers: { authorization: `Bearer ${secret}` } });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  // Each test starts past the 30s public cache window of the previous one.
  now = new Date(now.getTime() + 120_000);
  vi.spyOn(Date, "now").mockReturnValue(now.getTime());
  jobs = [];
  databaseFetch.mockReset();
  databaseFetch.mockImplementation(async (input) => {
    const query = new URL(String(input)).searchParams;
    const matches = jobs.filter((row) => [...query].every(([field, filter]) => {
      if (field === "status") {
        return filter.startsWith("eq.") ? row.status === filter.slice(3) : true;
      }
      if (field === "created_at" || field === "started_at") {
        return row[field] < filter.slice(3);
      }
      return true;
    }));
    return new Response(null, { headers: { "content-range": `*/${matches.length}` } });
  });
  vi.mocked(createAdminClient).mockReturnValue(createClient<Database>(
    "https://health.example.test", "synthetic-test-key",
    { global: { fetch: databaseFetch }, auth: { persistSession: false } },
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  const publicRequest = () => new Request("http://localhost/api/health");

  it("public request returns 200 with a body that has no details when healthy", async () => {
    jobs = [job("queued", 1), job("running", 4)];
    const response = await GET(publicRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("public request returns 503 when the queue is stale, still without details", async () => {
    jobs = [job("queued", 16)];
    for (const request of [publicRequest(), authed("wrong")]) {
      vi.spyOn(Date, "now").mockReturnValue(now.getTime());
      const response = await GET(request);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "degraded" });
    }
  });

  it("two public hits inside the TTL run the checks once", async () => {
    await GET(publicRequest());
    const calls = databaseFetch.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    vi.spyOn(Date, "now").mockReturnValue(now.getTime() + 29_000);
    await GET(publicRequest());
    expect(databaseFetch.mock.calls.length).toBe(calls);
    vi.spyOn(Date, "now").mockReturnValue(now.getTime() + 31_000);
    await GET(publicRequest());
    expect(databaseFetch.mock.calls.length).toBe(calls * 2);
  });

  it("concurrent public misses share one in-flight check", async () => {
    await Promise.all([GET(publicRequest()), GET(publicRequest()), GET(publicRequest())]);
    expect(databaseFetch.mock.calls.length).toBe(5);
  });

  it("a bearer request returns details and is not cached", async () => {
    jobs = [job("queued", 1)];
    await GET(publicRequest());
    const before = databaseFetch.mock.calls.length;
    const response = await GET(authed());
    expect(await response.json()).toMatchObject({ status: "ok", checks: { database: "ok", queue: "ok" }, queued: 1 });
    expect(databaseFetch.mock.calls.length).toBe(before + 5);
  });

  it("without a configured secret a bearer never unlocks details", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(new Request("http://localhost/api/health", { headers: { authorization: "Bearer " } }));
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("accepts an empty queue", async () => {
    const response = await GET(authed());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", backlog: 0 });
  });

  it("accepts fresh queued and running work", async () => {
    jobs = [job("queued", 1), job("running", 4)];
    expect((await GET(authed())).status).toBe(200);
  });

  it("alerts when the worker leaves queued work untouched for over fifteen minutes", async () => {
    jobs = [job("queued", 16)];
    const response = await GET(authed());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "degraded", checks: { database: "ok", queue: "stale-queued" },
    });
  });

  it("still alerts on stale running jobs", async () => {
    jobs = [job("running", 16)];
    const response = await GET(authed());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ checks: { queue: "stale-running" } });
  });

  it("reports an unconfigured database", async () => {
    vi.mocked(createAdminClient).mockReturnValue(null);
    expect((await GET(authed())).status).toBe(503);
    expect(databaseFetch).not.toHaveBeenCalled();
  });

  it("does not expose database failure details", async () => {
    databaseFetch.mockResolvedValue(new Response(JSON.stringify({ message: "internal database detail" }), { status: 503 }));
    const response = await GET(authed());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  });

  it("reports client initialization failure without throwing or leaking configuration", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => { throw new Error("internal configuration detail"); });
    const response = await GET(authed());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  });

  it("returns a controlled failure when the database does not respond", async () => {
    databaseFetch.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.throwIfAborted();
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    const response = await GET(authed());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  }, 8000);
});
