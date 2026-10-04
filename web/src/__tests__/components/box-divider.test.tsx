import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BoxDivider } from "@/components/forensic/divider";

afterEach(cleanup);

describe("BoxDivider", () => {
  it("exposes a label as a level-2 heading and keeps the rule decorative", () => {
    const { container } = render(<BoxDivider label="plan and billing" />);
    expect(screen.getByRole("heading", { level: 2, name: "plan and billing" })).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveAttribute("aria-hidden", "true");
  });

  it("is hidden from assistive tech when it has no label", () => {
    const { container } = render(<BoxDivider />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
