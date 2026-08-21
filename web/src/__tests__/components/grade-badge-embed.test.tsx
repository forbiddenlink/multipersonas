import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GradeBadgeEmbed } from "@/components/grade-badge-embed";

describe("GradeBadgeEmbed", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders badge preview and copy buttons", () => {
    render(<GradeBadgeEmbed token="test-token" host="example.com" />);

    expect(screen.getByText("Embed Scorecard Badge")).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy Markdown/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Copy HTML/i })).toBeDefined();
  });

  it("copies markdown snippet to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<GradeBadgeEmbed token="test-token" host="example.com" />);
    const copyBtn = screen.getByRole("button", { name: /Copy Markdown/i });
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("[![Accessibility Grade for example.com]"),
    );
  });
});
