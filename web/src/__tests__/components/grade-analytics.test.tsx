import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GradeArrival } from "@/components/grade-arrival";
import { gradeFailureReason, trackProductEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  trackProductEvent: vi.fn(),
}));

const base = { host: "example.com", createdAt: new Date(Date.now() - 4000).toISOString() };
let n = 0;

beforeEach(() => {
  vi.mocked(trackProductEvent).mockClear();
});
afterEach(cleanup);

describe("GradeArrival analytics", () => {
  it("fires grade_completed once when a watched grade finishes, not on re-render", () => {
    const token = `tok-${++n}`;
    const { rerender } = render(<GradeArrival {...base} token={token} status="running" />);
    expect(trackProductEvent).not.toHaveBeenCalled();

    rerender(<GradeArrival {...base} token={token} status="completed" grade="B" pagesScanned={7} />);
    rerender(<GradeArrival {...base} token={token} status="completed" grade="B" pagesScanned={7} />);

    expect(trackProductEvent).toHaveBeenCalledTimes(1);
    const [event, props] = vi.mocked(trackProductEvent).mock.calls[0]!;
    expect(event).toBe("grade_completed");
    expect(props).toMatchObject({ grade: "B", pages: 7 });
    expect(props?.ms_to_result).toBeGreaterThanOrEqual(4000);
    expect(JSON.stringify(props)).not.toContain(token);
  });

  it("does not fire for a grade that was already complete on first load", () => {
    render(<GradeArrival {...base} token={`tok-${++n}`} status="completed" grade="A" pagesScanned={3} />);
    expect(trackProductEvent).not.toHaveBeenCalled();
  });

  it("fires grade_failed with a coarse reason, never the raw error", () => {
    const token = `tok-${++n}`;
    const { rerender } = render(<GradeArrival {...base} token={token} status="queued" />);
    rerender(<GradeArrival {...base} token={token} status="failed" error="Navigation timeout of 30000ms at https://x.test/?t=secret" />);
    expect(trackProductEvent).toHaveBeenCalledWith("grade_failed", { reason: "timeout" });
  });

  it("does not fire twice for the same token across remounts", () => {
    const token = `tok-${++n}`;
    const first = render(<GradeArrival {...base} token={token} status="running" />);
    first.rerender(<GradeArrival {...base} token={token} status="completed" grade="C" pagesScanned={2} />);
    first.unmount();
    const second = render(<GradeArrival {...base} token={token} status="running" />);
    second.rerender(<GradeArrival {...base} token={token} status="completed" grade="C" pagesScanned={2} />);
    expect(trackProductEvent).toHaveBeenCalledTimes(1);
  });
});

describe("gradeFailureReason", () => {
  it("buckets errors without leaking text", () => {
    expect(gradeFailureReason(null)).toBe("unknown");
    expect(gradeFailureReason("net::ERR_NAME_NOT_RESOLVED")).toBe("unreachable");
    expect(gradeFailureReason("boom")).toBe("scan_error");
  });
});
