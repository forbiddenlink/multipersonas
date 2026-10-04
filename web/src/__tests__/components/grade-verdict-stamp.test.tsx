import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GradeVerdictStamp } from "@/components/dossier/grade-verdict-stamp";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduce && q.includes("prefers-reduced-motion"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

describe("GradeVerdictStamp", () => {
  it("is one labelled image, so the label is on a role that allows it", () => {
    stubMotion(false);
    render(<GradeVerdictStamp grade="B" score={82} />);
    const stamp = screen.getByRole("img", { name: "Verdict: grade B, score 82 of 100" });
    expect(stamp).toBeInTheDocument();
    expect(stamp.textContent).toContain("82");
  });

  it("does not animate or touch the score under prefers-reduced-motion", () => {
    stubMotion(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<GradeVerdictStamp grade="A" score={97} animate />);
    expect(raf).not.toHaveBeenCalled();
    expect(screen.getByRole("img").textContent).toContain("97");
  });

  it("counts up from zero when motion is allowed, leaving the label at the final value", () => {
    stubMotion(false);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    render(<GradeVerdictStamp grade="A" score={97} animate />);
    expect(raf).toHaveBeenCalled();
    const stamp = screen.getByRole("img");
    expect(stamp.textContent).toContain("0 / 100");
    expect(stamp).toHaveAccessibleName("Verdict: grade A, score 97 of 100");
  });
});
