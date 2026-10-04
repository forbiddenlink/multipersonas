import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GradePoll } from "@/components/grade-poll";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

describe("GradePoll", () => {
  it("narrates a queued scan and marks only the first stage current", () => {
    render(<GradePoll token="t" status="queued" />);
    expect(screen.getByRole("status")).toHaveTextContent(/queued/i);
    const current = screen.getAllByRole("listitem").filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Queued");
  });

  it("moves to crawling + axe-core when the job is running, with no invented page counts", () => {
    render(<GradePoll token="t" status="running" />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(done)");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[1]).toHaveTextContent("Crawling pages and running axe-core");
    expect(screen.getByRole("status")).not.toHaveTextContent(/\d+ of \d+/);
  });
});
