import { describe, expect, it, vi } from "vitest";
import { githubSignInEnabled } from "@/lib/auth-providers";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://ref.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" };

function settings(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response);
}

describe("githubSignInEnabled", () => {
  it("is true when Supabase reports the GitHub provider enabled", async () => {
    expect(await githubSignInEnabled({ env, fetchImpl: settings({ external: { github: true } }) })).toBe(true);
  });

  it("is false when the provider is off", async () => {
    expect(await githubSignInEnabled({ env, fetchImpl: settings({ external: { github: false } }) })).toBe(false);
  });

  it("fails closed: hides GitHub when settings cannot be read", async () => {
    expect(await githubSignInEnabled({ env, fetchImpl: settings({}, false) })).toBe(false);
    const throwing = vi.fn(async () => { throw new Error("network"); });
    expect(await githubSignInEnabled({ env, fetchImpl: throwing as unknown as typeof fetch })).toBe(false);
  });

  it("does not call out when Supabase is not configured", async () => {
    const fetchImpl = settings({ external: { github: true } });
    expect(await githubSignInEnabled({ env: {}, fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
