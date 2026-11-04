// Owner allowlist for internal pages (e.g. the waitlist signal view). Reads a
// server-only ADMIN_EMAILS env var (comma-separated). NOT NEXT_PUBLIC — never expose
// this list to the client. When unset, no one is an admin (safe default).
// Parsed on each call so tests (and a process whose env is injected after import)
// see the current value. The string is tiny.
function adminEmailList(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!email) return false;
  return adminEmailList(env).includes(email.trim().toLowerCase());
}

/**
 * Admin check for a signed-in user. The email must be on the allowlist AND confirmed:
 * if signup ever stops requiring confirmation, an unconfirmed account that claims an
 * allowlisted address must not see admin pages.
 */
export function isAdminUser(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!user?.email_confirmed_at) return false;
  return isAdminEmail(user.email, env);
}
