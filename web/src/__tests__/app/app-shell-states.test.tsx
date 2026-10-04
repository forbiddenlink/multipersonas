import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AppError from "@/app/(app)/error";
import RootError from "@/app/error";
import AppLoading from "@/app/(app)/loading";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

afterEach(cleanup);

const failure = Object.assign(new Error('relation "findings" does not exist (user 42)'), {
  digest: "dg-1234",
});

describe("error boundaries", () => {
  it.each([
    ["(app) boundary", AppError],
    ["root boundary", RootError],
  ])("%s hides the raw message and shows the digest", (_name, Component) => {
    render(<Component error={failure} reset={() => {}} />);
    expect(document.body.textContent).not.toContain("relation");
    expect(document.body.textContent).not.toContain("user 42");
    expect(screen.getByText(/dg-1234/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("omits the reference line when there is no digest", () => {
    render(<AppError error={new Error("boom")} reset={() => {}} />);
    expect(screen.queryByText(/reference/i)).not.toBeInTheDocument();
  });
});

describe("loading state", () => {
  it("is a status region with accessible text", () => {
    render(<AppLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});
