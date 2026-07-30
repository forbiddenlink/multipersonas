// Owner allowlist for internal pages (e.g. the waitlist signal view). Reads a
// server-only ADMIN_EMAILS env var (comma-separated). NOT NEXT_PUBLIC — never expose
// this list to the client. When unset, no one is an admin (safe default).
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
