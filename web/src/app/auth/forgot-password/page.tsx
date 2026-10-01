"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, AuthCardTab, AuthFormError, RESET_STEPS } from "@/components/dossier/app-auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main id="main">
        <AuthShell reasonsTitle="What happens next" reasons={RESET_STEPS} serial="0009">
          <div className="sheet w-full max-w-sm">
            <AuthCardTab route="reset-password" />
            <div className="px-5 py-6 text-center">
              <h1 className="display text-2xl leading-tight text-foreground">Check your email</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We sent a password reset link to <strong className="font-medium text-foreground">{email}</strong>.
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-link inline-flex min-h-10 items-center">
                  &larr; Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </AuthShell>
      </main>
    );
  }

  return (
    <main id="main">
      <AuthShell reasonsTitle="What happens next" reasons={RESET_STEPS} serial="0009">
        <div className="sheet w-full max-w-sm">
          <AuthCardTab route="reset-password" />
          <div className="px-5 py-6">
            <div>
              <p className="label-mono">Locked out</p>
              <h1 className="display mt-1.5 text-2xl leading-tight text-foreground">Reset <span className="mark-sweep">your password</span></h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {error && <AuthFormError id="form-error" message={error} />}

              <form onSubmit={handleSubmit} aria-describedby={error ? "form-error" : undefined} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="label-mono">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <Button type="submit" loading={loading} className="w-full">
                  Send reset link
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/auth/login" className="text-link inline-flex min-h-10 items-center">
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
    </main>
  );
}
