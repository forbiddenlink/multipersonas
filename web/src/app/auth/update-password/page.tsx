"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/forensic/wordmark";
import { Eye, EyeOff } from "lucide-react";

// Terminal header bar shared by every state of this card — a mono prompt line
// framing the card as tool output, per the forensic-terminal auth spec.
function CardHeaderBar() {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3 font-mono text-xs text-muted-foreground">
      <span aria-hidden="true" className="select-none text-[var(--primary)]">
        ›
      </span>
      <Wordmark className="text-foreground" />
      <span className="text-muted-foreground/60">/ update-password</span>
    </div>
  );
}

function validatePassword(v: string): string | undefined {
  const issues: string[] = [];
  if (v.length < 8) issues.push("at least 8 characters");
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v)) issues.push("a number or symbol");
  return issues.length > 0 ? `Password needs ${issues.join(" and ")}.` : undefined;
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    // Requires an active session — supplied by the recovery link (via /auth/callback)
    // or by an already signed-in user changing their password from settings.
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes("session")
          ? "This reset link has expired. Request a new one from the sign-in page."
          : updateError.message,
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card">
          <CardHeaderBar />
          <div className="px-5 py-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Your password has been changed.</p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card">
        <CardHeaderBar />
        <div className="px-5 py-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a password you don&apos;t use anywhere else
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {error && (
              <div
                id="update-password-error"
                role="alert"
                className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="password"
                  className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
                >
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby={error ? "update-password-error" : undefined}
                    className="rounded-sm pr-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">8+ characters with a number or symbol</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="confirm-password"
                  className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
                >
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
