/**
 * Where a free user goes to ask for Pro. The waitlist inbox is owner-only
 * (`/waitlist` 404s for everyone else), so the public fallback is the founding page.
 */
export function proAccessHref(env: NodeJS.ProcessEnv = process.env): string {
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (email) return `mailto:${email}?subject=Pro%20access`;
  return "/for-agencies";
}
