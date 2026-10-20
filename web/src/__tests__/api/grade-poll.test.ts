import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/grade/[token]/route";
import * as gradeLib from "@/lib/grade";

vi.mock("@/lib/grade", () => ({ getGraderScan: vi.fn() }));

const call = () =>
  GET(new Request("https://personaudit.com/api/grade/tok"), { params: Promise.resolve({ token: "tok" }) });

describe("GET /api/grade/[token]", () => {
  it("returns 503 JSON, not a 500, when the scan read throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(gradeLib.getGraderScan).mockRejectedValueOnce(new Error("Could not load scan result."));
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "Could not load scan result. Try again shortly." });
  });

  it("still returns 404 when the token has no scan", async () => {
    vi.mocked(gradeLib.getGraderScan).mockResolvedValueOnce(null);
    const res = await call();
    expect(res.status).toBe(404);
  });
});
