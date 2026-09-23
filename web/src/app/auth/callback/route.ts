import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectPath = safeRedirectPath(searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    } catch {
      // Preserve the intended destination when the auth provider is unavailable.
    }
  }

  // A failed exchange whose destination was the password-reset page means the recovery
  // link is expired/used — surface that distinctly so login shows reset-specific copy
  // instead of a misleading "check your password" message.
  const errorCode = redirectPath.startsWith("/auth/update-password") ? "reset_expired" : "auth";
  const loginUrl = new URL("/auth/login", origin);
  loginUrl.searchParams.set("error", errorCode);
  if (errorCode !== "reset_expired") {
    loginUrl.searchParams.set("returnTo", redirectPath);
  }
  return NextResponse.redirect(loginUrl);
}
