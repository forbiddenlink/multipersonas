import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MobileNav } from "@/components/mobile-nav";

const ITEMS = [{ href: "/pricing", label: "Pricing" }] as const;

afterEach(cleanup);

function openMenu() {
  const { container } = render(<MobileNav items={ITEMS} showSignIn />);
  const details = container.querySelector("details") as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  return details;
}

it("closes on Escape and returns focus to the toggle", () => {
  const details = openMenu();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(screen.getByLabelText("Menu"));
});

it("closes on a tap outside the menu", () => {
  const details = openMenu();
  fireEvent.pointerDown(document.body);
  expect(details.open).toBe(false);
});

it("closes when a link is chosen and offers Sign in only when signed out", () => {
  const details = openMenu();
  expect(screen.getByText("Sign in")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Pricing"));
  expect(details.open).toBe(false);
});
