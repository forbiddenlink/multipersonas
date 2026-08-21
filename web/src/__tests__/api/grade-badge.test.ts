import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/grade/[token]/badge/route";
import * as gradeLib from "@/lib/grade";

vi.mock("@/lib/grade", () => ({
  getGraderScan: vi.fn(),
}));

describe("GET /api/grade/[token]/badge", () => {
  it("returns an SVG badge with completed score", async () => {
    vi.mocked(gradeLib.getGraderScan).mockResolvedValueOnce({
      token: "tok-123",
      entry_url: "https://example.com",
      status: "completed",
      pages_visited: ["https://example.com"],
      error: null,
      created_at: new Date().toISOString(),
      job_id: null,
      report: {
        grade: "A",
        score: 96,
        pagesScanned: 1,
        totalViolations: 2,
        byImpact: { critical: 0, serious: 0, moderate: 1, minor: 1 },
        wcagAAViolations: 1,
        perPage: [],
        rules: [],
      },
    });

    const res = await GET(new Request("https://personaudit.com/api/grade/tok-123/badge"), {
      params: Promise.resolve({ token: "tok-123" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    const svg = await res.text();
    expect(svg).toContain("<svg");
    expect(svg).toContain("accessibility");
    expect(svg).toContain("A (96/100)");
  });

  it("returns a pending SVG badge when scan is running", async () => {
    vi.mocked(gradeLib.getGraderScan).mockResolvedValueOnce({
      token: "tok-456",
      entry_url: "https://example.com",
      status: "running",
      pages_visited: [],
      error: null,
      created_at: new Date().toISOString(),
      job_id: null,
      report: null,
    });

    const res = await GET(new Request("https://personaudit.com/api/grade/tok-456/badge"), {
      params: Promise.resolve({ token: "tok-456" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    const svg = await res.text();
    expect(svg).toContain("grading…");
  });
});
