type Env = Record<string, string | undefined>;

/**
 * True when the Supabase project has the GitHub provider switched on. Reads GoTrue's public
 * `/auth/v1/settings` (anon key only), so the "with GitHub" buttons appear exactly when the
 * provider works instead of sending every click to an "Unsupported provider" error.
 */
export async function githubSignInEnabled({
  env = process.env,
  fetchImpl = fetch,
}: { env?: Env; fetchImpl?: typeof fetch } = {}): Promise<boolean> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  // Fail closed: a button that cannot work is worse than no button.
  try {
    const res = await fetchImpl(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      // Provider changes are rare; avoid a GoTrue round trip on every sign-in page view.
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return false;
    const body = (await res.json()) as { external?: { github?: boolean } };
    return body.external?.github === true;
  } catch {
    return false;
  }
}
