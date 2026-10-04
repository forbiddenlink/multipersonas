import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { captureServerEvent } from "@/lib/analytics-server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Email links carry a token hash to this route on personaudit.com instead of pointing at
// the Supabase domain: a sender on one domain linking to another reads as phishing to spam
// filters. Only the types Supabase emails can carry are accepted.
const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set([
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email",
  "email_change",
]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const redirectPath = safeRedirectPath(searchParams.get("next"));

  if (tokenHash && otpType && EMAIL_OTP_TYPES.has(otpType)) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as EmailOtpType,
      });
      if (!error) return NextResponse.redirect(`${origin}${redirectPath}`);
    } catch {
      // Fall through to the same login redirect as a failed code exchange.
    }
  } else if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // OAuth lands here with the browser mid-redirect, so only the server can see it
        // succeed. Email-confirm and password-reset codes share this route; skip those.
        if (data?.user && data.user.app_metadata?.provider === "github") {
          await captureServerEvent(data.user.id, "login_completed", { method: "github" });
        }
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
