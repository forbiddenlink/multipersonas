import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuditHistory } from "@/components/audit-history";

afterEach(cleanup);

describe("AuditHistory empty state", () => {
  it("points a paid account at the form", () => {
    render(<AuditHistory audits={[]} canRunHosted />);
    expect(screen.getByText(/form above/i)).toBeInTheDocument();
  });

  it("never mentions a form a Free account cannot see", () => {
    render(<AuditHistory audits={[]} canRunHosted={false} />);
    expect(screen.queryByText(/form/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Solo and up/)).toBeInTheDocument();
  });
});
