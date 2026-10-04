import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession } }),
}));

import { HeaderActions } from "@/components/header-actions";

const ITEMS = [{ href: "/pricing", label: "Pricing" }] as const;
const CTA = { href: "/#scan", label: "Grade a site free", shortLabel: "Grade a site" };

beforeEach(() => {
  getSession.mockReset();
});
afterEach(cleanup);

it("renders the signed-out header on first paint", () => {
  getSession.mockReturnValue(new Promise(() => {}));
  render(<HeaderActions cta={CTA} items={ITEMS} />);
  expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  expect(screen.queryByText("Dashboard")).toBeNull();
});

it("swaps Sign in for Dashboard once a session exists", async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: "u" } } } });
  render(<HeaderActions cta={CTA} items={ITEMS} />);
  await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  expect(screen.queryByText("Grade a site free")).toBeNull();
});

it("stays signed out when the auth lookup fails", async () => {
  getSession.mockRejectedValue(new Error("no config"));
  render(<HeaderActions cta={CTA} items={ITEMS} />);
  await Promise.resolve();
  expect(screen.queryByText("Dashboard")).toBeNull();
});

it("keeps SiteHeader free of request-time APIs so marketing pages can prerender", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/components/site-header.tsx"), "utf-8");
  expect(src).not.toMatch(/supabase\/server/);
  expect(src).not.toMatch(/auth\.getUser/);
  expect(src).not.toMatch(/cookies\(|headers\(/);
});
