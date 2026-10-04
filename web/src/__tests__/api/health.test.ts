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

const now = new Date("2026-09-29T12:00:00Z");
let jobs: Job[];
const databaseFetch = vi.fn<typeof fetch>();

function job(status: Job["status"], ageMinutes: number): Job {
  const timestamp = new Date(now.getTime() - ageMinutes * 60_000).toISOString();
  return { status, created_at: timestamp, started_at: timestamp };
}

beforeEach(() => {
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

afterEach(() => vi.restoreAllMocks());

describe("GET /api/health", () => {
  it("accepts an empty queue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", backlog: 0 });
  });

  it("accepts fresh queued and running work", async () => {
    jobs = [job("queued", 1), job("running", 4)];
    expect((await GET()).status).toBe(200);
  });

  it("alerts when the worker leaves queued work untouched for over fifteen minutes", async () => {
    jobs = [job("queued", 16)];
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: "degraded", checks: { database: "ok", queue: "stale-queued" },
    });
  });

  it("still alerts on stale running jobs", async () => {
    jobs = [job("running", 16)];
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ checks: { queue: "stale-running" } });
  });

  it("reports an unconfigured database", async () => {
    vi.mocked(createAdminClient).mockReturnValue(null);
    expect((await GET()).status).toBe(503);
    expect(databaseFetch).not.toHaveBeenCalled();
  });

  it("does not expose database failure details", async () => {
    databaseFetch.mockResolvedValue(new Response(JSON.stringify({ message: "internal database detail" }), { status: 503 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  });

  it("reports client initialization failure without throwing or leaking configuration", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => { throw new Error("internal configuration detail"); });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  });

  it("returns a controlled failure when the database does not respond", async () => {
    databaseFetch.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.throwIfAborted();
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", checks: { database: "error", queue: "error" } });
  }, 8000);
});
