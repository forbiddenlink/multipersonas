import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradeArrival, GRADE_HEADING_ID } from "@/components/grade-arrival";

afterEach(cleanup);

function Harness({ status, grade }: { status: "queued" | "running" | "completed" | "failed"; grade?: string }) {
  return (
    <>
      <h1 id={GRADE_HEADING_ID} tabIndex={-1}>
        example.com accessibility grade
      </h1>
      <GradeArrival status={status} host="example.com" grade={grade} />
    </>
  );
}

describe("GradeArrival", () => {
  it("announces nothing and keeps focus when the result was already complete", () => {
    render(<Harness status="completed" grade="B" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(document.body);
  });

  it("announces politely and focuses the heading when a polled grade completes", async () => {
    const { rerender } = render(<Harness status="running" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await act(async () => {
      rerender(<Harness status="completed" grade="C" />);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Grade complete. example.com scored C.");
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("announces a failure that arrives while watching", async () => {
    const { rerender } = render(<Harness status="queued" />);
    await act(async () => {
      rerender(<Harness status="failed" />);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Grade failed for example.com.");
  });

  it("does not announce a queued to running step as completion", async () => {
    const { rerender } = render(<Harness status="queued" />);
    await act(async () => {
      rerender(<Harness status="running" />);
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
