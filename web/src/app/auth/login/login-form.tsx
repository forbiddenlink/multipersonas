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
import { AuthShell, AuthCardTab, AuthFormError } from "@/components/dossier/app-auth-shell";

// Callers redirect here with either ?next= (server guards: settings, projects actions)
// or ?returnTo= (middleware). Read both; safeRedirectPath blocks open redirects.
function safeReturnTo(params: URLSearchParams): string {
  return safeRedirectPath(params.get("next") ?? params.get("returnTo"));
}

export function LoginForm({ githubEnabled }: { githubEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams);
  const signupHref =
    returnTo === "/dashboard" ? "/auth/signup" : `/auth/signup?returnTo=${encodeURIComponent(returnTo)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(() => {
    const err = searchParams.get("error");
    // Only surface known auth callback codes — a leaked ?error=agency from settings
    // must not show as "Authentication failed".
    if (err === "reset_expired")
      return "That password reset link has expired or was already used. Request a new one from “Forgot password?” below.";
    if (err === "auth") {
      return githubEnabled
        ? "Authentication failed. Check your email and password, or try GitHub."
        : "Authentication failed. Check your email and password.";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!email) {
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      router.refresh();
      router.push(returnTo);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubLogin() {
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

  return (
    <AuthShell>
      <div className="sheet w-full max-w-sm">
        <AuthCardTab route="sign-in" />
        <div className="px-5 py-6">
          <div>
            <p className="label-mono">Welcome back</p>
            <h1 className="display mt-1.5 text-[1.9rem] leading-tight text-foreground"><span className="mark-sweep">Sign in</span></h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Open your audit history and resume from where you left off.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
          {formError && <AuthFormError id="form-error" message={formError} />}

          <form onSubmit={handleEmailLogin} aria-describedby={formError ? "form-error" : undefined} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="label-mono">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="label-mono">Password</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
              <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-link text-sm inline-flex min-h-10 items-center">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          {githubEnabled ? (
            <>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="font-mono text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <GitHubAuthButton onClick={handleGitHubLogin} loading={loading} label="Sign in with GitHub" />
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="text-link">
              Sign up
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
