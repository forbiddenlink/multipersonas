"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GitHubAuthButton } from "@/components/github-auth-button";
import { Eye, EyeOff } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { trackProductEvent } from "@/lib/analytics";
import { AuthShell, AuthCardTab, AuthFormError } from "@/components/dossier/app-auth-shell";

// Same-origin path only — mirrors login-form so a crafted ?returnTo=//evil.com
// can't turn signup/OAuth into an open redirect.
function safeReturnTo(params: URLSearchParams): string {
  return safeRedirectPath(params.get("next") ?? params.get("returnTo"));
}

function returnToQuery(returnTo: string): string {
  return returnTo === "/dashboard" ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
}

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams);
  const loginHref = `/auth/login${returnToQuery(returnTo)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function validateField(field: keyof FieldErrors, value?: string): string | undefined {
    switch (field) {
      case "email": {
        const v = value ?? email;
        if (!v) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
        return undefined;
      }
      case "password": {
        const v = value ?? password;
        const issues: string[] = [];
        if (v.length < 8) issues.push("at least 8 characters");
        if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v)) issues.push("a number or symbol");
        if (issues.length > 0) return `Password needs ${issues.join(" and ")}.`;
        return undefined;
      }
      case "confirmPassword": {
        const v = value ?? confirmPassword;
        if (v && v !== password) return "Passwords don't match.";
        if (!v) return "Confirm your password.";
        return undefined;
      }
    }
  }

  function handleBlur(field: keyof FieldErrors, value: string) {
    if (!value) return; // don't validate empty fields on blur (let required handle it)
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }

  function validateAll(): boolean {
    const errors: FieldErrors = {
      email: validateField("email"),
      password: validateField("password"),
      confirmPassword: validateField("confirmPassword"),
    };
    setFieldErrors(errors);

    // Focus first error field
    if (errors.email) {
      emailRef.current?.focus();
      return false;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return false;
    }
    if (errors.confirmPassword) {
      confirmRef.current?.focus();
      return false;
    }
    return true;
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!validateAll()) return;

    setLoading(true);
    trackProductEvent("signup_started", { method: "password" });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
        },
      });

      if (error) {
        setFormError(error.message);
        trackProductEvent("signup_rejected", { method: "password", reason: "auth_error" });
        return;
      }

      // If the project has email confirmation disabled, signUp returns an active session and
      // the user is already logged in — send them to their intended destination instead of the
      // (dead-end) "check your email" screen.
      if (data.session) {
        trackProductEvent("signup_completed", {
          method: "password",
          email_confirmation_required: false,
        });
        router.refresh();
        router.push(returnTo);
        return;
      }

      trackProductEvent("signup_completed", {
        method: "password",
        email_confirmation_required: true,
      });
      setSuccess(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
      trackProductEvent("signup_rejected", { method: "password", reason: "network_error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubSignup() {
    setFormError("");
    setLoading(true);
    trackProductEvent("signup_oauth_started", { provider: "github" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
        },
      });

      if (error) {
        setFormError(error.message);
        setLoading(false);
        trackProductEvent("signup_oauth_rejected", {
          provider: "github",
          reason: "auth_error",
        });
      }
      // On success the browser navigates away — leave loading true.
    } catch {
      setFormError("Something went wrong. Please try again.");
      setLoading(false);
      trackProductEvent("signup_oauth_rejected", {
        provider: "github",
        reason: "network_error",
      });
    }
  }

  if (success) {
    return (
      <AuthShell reasonsTitle="Why an account" serial="0008">
        <div className="sheet w-full max-w-sm">
          <AuthCardTab route="create-account" />
          <div className="px-5 py-6 text-center">
            <h1 className="display text-2xl leading-tight text-foreground">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to <strong className="font-medium text-foreground">{email}</strong>. Click it
              to activate your account.
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              Already confirmed?{" "}
              <Link href={loginHref} className="text-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell reasonsTitle="Why an account" serial="0008">
      <div className="sheet w-full max-w-sm">
        <AuthCardTab route="create-account" />
        <div className="px-5 py-6">
          <div>
            <p className="label-mono">Free to start</p>
            <h1 className="display mt-1.5 text-[1.9rem] leading-tight text-foreground">Create <span className="mark-sweep">your account</span></h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Save every audit you run: axe verdicts and persona task-success, kept in one place.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
          {formError && <AuthFormError id="form-error" message={formError} />}

          <form onSubmit={handleSignup} aria-describedby={formError ? "form-error" : undefined} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="label-mono">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                onBlur={(e) => handleBlur("email", e.target.value)}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                required
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-[var(--redline)]">■ {fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="label-mono">Password</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  onBlur={(e) => handleBlur("password", e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="password-error" role="alert" className="text-xs text-[var(--redline)]">■ {fieldErrors.password}</p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">8+ characters with a number or symbol</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password" className="label-mono">Confirm password</Label>
              <div className="relative">
                <Input
                  ref={confirmRef}
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                  onBlur={(e) => handleBlur("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirm-error" role="alert" className="text-xs text-[var(--redline)]">■ {fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="font-mono text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <GitHubAuthButton onClick={handleGitHubSignup} loading={loading} label="Sign up with GitHub" />

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account you accept the{" "}
            <Link href="/terms" className="text-link">
              Terms
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="text-link whitespace-nowrap">
              Privacy policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={loginHref} className="text-link">
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="text-link inline-flex min-h-10 items-center">
              &larr; Back to home
            </Link>
          </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
