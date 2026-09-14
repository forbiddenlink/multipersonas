import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatCount } from "@/components/forensic/stat-count";

afterEach(() => {
  cleanup();
});

describe("StatCount", () => {
  it("renders the final number on first paint so proof stats are never $0", () => {
    render(<StatCount value={1_000_000} prefix="$" />);
    expect(screen.getByLabelText("$1,000,000")).toHaveTextContent("$1,000,000");
  });
});
