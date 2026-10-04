import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: {} }) }));
import { LoginForm } from "@/app/auth/login/login-form";
import { SignupForm } from "@/app/auth/signup/signup-form";

afterEach(cleanup);

describe("GitHub sign-in is offered only when it works", () => {
  it("hides the GitHub option on sign-in when the provider is off", () => {
    render(<LoginForm githubEnabled={false} />);
    expect(screen.queryByRole("button", { name: /github/i })).toBeNull();
    expect(screen.queryByText(/^or$/)).toBeNull();
  });

  it("shows it on sign-in when the provider is on", () => {
    render(<LoginForm githubEnabled />);
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeTruthy();
  });

  it("hides it on sign-up when the provider is off", () => {
    render(<SignupForm githubEnabled={false} />);
    expect(screen.queryByRole("button", { name: /github/i })).toBeNull();
  });
});
