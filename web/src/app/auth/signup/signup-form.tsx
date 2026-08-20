"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/forensic/wordmark";
import { Eye, EyeOff } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";

// Same-origin path only — mirrors login-form so a crafted ?returnTo=//evil.com
// can't turn signup/OAuth into an open redirect.
function safeReturnTo(params: URLSearchParams): string {
  return safeRedirectPath(params.get("next") ?? params.get("returnTo"));
}

function returnToQuery(returnTo: string): string {
  return returnTo === "/dashboard" ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
}

// Terminal header bar — frames the auth card as tool output (forensic-terminal spec).
function CardHeaderBar({ route }: { route: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3 font-mono text-xs text-muted-foreground">
      <span aria-hidden="true" className="select-none text-[var(--primary)]">
        ›
      </span>
      <Wordmark className="text-foreground" />
      <span className="text-muted-foreground">/ {route}</span>
    </div>
  );
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!validateAll()) return;

    setLoading(true);
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
        return;
      }

      // If the project has email confirmation disabled, signUp returns an active session and
      // the user is already logged in — send them to their intended destination instead of the
      // (dead-end) "check your email" screen.
      if (data.session) {
        router.refresh();
        router.push(returnTo);
        return;
      }

      setSuccess(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubSignup() {
    setFormError("");
    setLoading(true);
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
      }
      // On success the browser navigates away — leave loading true.
    } catch {
      setFormError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card">
          <CardHeaderBar route="create-account" />
          <div className="px-5 py-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <strong className="font-medium text-foreground">{email}</strong>. Click it
              to activate your account.
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              Already confirmed?{" "}
              <Link
                href={loginHref}
                className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card">
        <CardHeaderBar route="create-account" />
        <div className="px-5 py-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Save every audit you run — axe verdicts and persona task-success, kept in one place.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
          {formError && (
            <div id="form-error" role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleSignup} aria-describedby={formError ? "form-error" : undefined} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
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
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
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
                  className="pr-10 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
                <p id="password-error" className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">8+ characters with a number or symbol</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Confirm password</Label>
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
                  className="pr-10 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
                <p id="confirm-error" className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="font-mono text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" onClick={handleGitHubSignup} disabled={loading} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-4"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign up with GitHub
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={loginHref}
              className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              &larr; Back to home
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
