import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProjectOffer } from "@/components/project-offer";

afterEach(cleanup);
const action = vi.fn();
const mine = { id: "p1", name: "Acme", url: "https://acme.com/" };

describe("ProjectOffer", () => {
  it("makes creating the project one labelled button with the name and url already filled", () => {
    const { container } = render(
      <ProjectOffer offer={{ kind: "create", prefill: { name: "acme.com", url: "https://acme.com/x" } }} planName="Free" action={action} />,
    );
    expect(screen.getByRole("button", { name: "Create a project for acme.com" })).toBeInTheDocument();
    expect(container.querySelector('input[name="name"]')).toHaveValue("acme.com");
    expect(container.querySelector('input[name="url"]')).toHaveValue("https://acme.com/x");
  });

  it("says the plan is at its limit and links the existing project and pricing", () => {
    render(<ProjectOffer offer={{ kind: "limit", limit: 1, project: mine }} planName="Free" action={action} />);
    expect(screen.getByRole("heading", { name: /Free plan is at its project limit/ })).toBeInTheDocument();
    expect(screen.getByText(/includes 1 project, and you have/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute("href", "/projects/p1");
    expect(screen.getByRole("link", { name: "pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("links the project that already tracks the site", () => {
    render(<ProjectOffer offer={{ kind: "exists", project: mine }} planName="Free" action={action} />);
    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute("href", "/projects/p1");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing without an offer", () => {
    const { container } = render(<ProjectOffer offer={{ kind: "none" }} planName="Free" action={action} />);
    expect(container).toBeEmptyDOMElement();
  });
});
