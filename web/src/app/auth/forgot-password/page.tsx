"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/forensic/wordmark";

// Terminal header bar shared by both states of this card — a mono prompt line
// framing the card as tool output, per the forensic-terminal auth spec.
function CardHeaderBar() {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3 font-mono text-xs text-muted-foreground">
      <span aria-hidden="true" className="select-none text-[var(--primary)]">
        ›
      </span>
      <Wordmark className="text-foreground" />
      <span className="text-muted-foreground">/ reset-password</span>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card">
          <CardHeaderBar />
          <div className="px-5 py-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to <strong className="font-medium text-foreground">{email}</strong>.
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card">
        <CardHeaderBar />
        <div className="px-5 py-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="email"
                  className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
                >
                  Email
                </Label>
                <Input
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

              <Button
                type="submit"
                disabled={loading}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
