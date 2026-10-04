import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createWorkerClient } from "./database.js";

const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
const pendingFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.spyOn(AbortSignal, "timeout").mockImplementation(() => nativeTimeout(20));
  pendingFetch.mockReset();
  pendingFetch.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.throwIfAborted();
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  }));
  vi.stubGlobal("fetch", pendingFetch);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const client = () => createWorkerClient("https://worker.example.test", "synthetic-test-key");
const bounded = <T>(request: PromiseLike<T>) => Promise.race([
  request, new Promise<string>((resolve) => setTimeout(() => resolve("still pending"), 200)),
]);

it("releases a stalled claim so the worker can retry on its next loop", async () => {
  const database = client();
  expect(await bounded(database.rpc("claim_audit_job"))).toMatchObject({ error: expect.any(Object) });
  pendingFetch.mockResolvedValue(new Response("null", { headers: { "content-type": "application/json" } }));
  expect(await database.rpc("claim_audit_job")).toMatchObject({ error: null });
});

it("bounds screenshot storage uploads as well as database requests", async () => {
  expect(await bounded(client().storage.from("journeys").upload("synthetic/frame.png", new Uint8Array([1]))))
    .toMatchObject({ error: expect.any(Object) });
});

it("keeps the deadline active while a database response body stalls", async () => {
  pendingFetch.mockImplementation(async (_input, init) => new Response(new ReadableStream({
    start(controller) {
      init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), { once: true });
    },
  })));
  expect(await bounded(client().rpc("claim_audit_job"))).toMatchObject({ error: expect.any(Object) });
});

it("preserves explicit request cancellation", async () => {
  const abort = new AbortController();
  abort.abort();
  expect(await bounded(client().from("audit_jobs").select("id").abortSignal(abort.signal)))
    .toMatchObject({ error: expect.any(Object) });
  expect(pendingFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
});
