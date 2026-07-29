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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(() => {
    const err = searchParams.get("error");
    if (err === "reset_expired")
      return "That password reset link has expired or was already used. Request a new one from “Forgot password?” below.";
    if (err) return "Authentication failed. Check your email and password, or try GitHub.";
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleEmailLogin(e: React.FormEvent) {
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

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setFormError(error.message);
      setLoading(false);
      return;
    }

    const returnTo = searchParams.get("returnTo") || "/dashboard";
    router.push(returnTo);
  }

  async function handleGitHubLogin() {
    setFormError("");
    const returnTo = searchParams.get("returnTo") || "/dashboard";
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
      },
    });

    if (error) {
      setFormError(error.message);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card">
        <CardHeaderBar route="sign-in" />
        <div className="px-5 py-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in to Personaudit</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to continue</p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
          {formError && (
            <div id="form-error" role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} aria-describedby={formError ? "form-error" : undefined} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="rounded-sm py-1 text-sm text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="font-mono text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" onClick={handleGitHubLogin} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-4"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in with GitHub
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Sign up
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
