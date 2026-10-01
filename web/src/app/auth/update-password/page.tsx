"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell, AuthCardTab, AuthFormError } from "@/components/dossier/app-auth-shell";

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    try {
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
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main id="main">
        <AuthShell>
          <div className="sheet w-full max-w-sm">
            <AuthCardTab route="update-password" />
            <div className="px-5 py-6 text-center">
              <h1 className="display text-2xl leading-tight text-foreground">Password updated</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your password has been changed.</p>
              <Link href="/dashboard" className={buttonVariants({ className: "mt-5 w-full" })}>
                Go to dashboard
              </Link>
            </div>
          </div>
        </AuthShell>
      </main>
    );
  }

  return (
    <main id="main">
      <AuthShell>
        <div className="sheet w-full max-w-sm">
          <AuthCardTab route="update-password" />
          <div className="px-5 py-6">
            <div>
              <p className="label-mono">Almost done</p>
              <h1 className="display mt-1.5 text-2xl leading-tight text-foreground">Set <span className="mark-sweep">a new password</span></h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Choose a password you don&apos;t use anywhere else.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {error && <AuthFormError id="update-password-error" message={error} />}

              <form
                onSubmit={handleSubmit}
                aria-describedby={error ? "update-password-error" : undefined}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="label-mono">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      aria-describedby={error ? "update-password-error" : "update-password-hint"}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {!error && (
                    <p id="update-password-hint" className="text-xs text-muted-foreground">
                      8+ characters with a number or symbol
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password" className="label-mono">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
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
                </div>

                <Button type="submit" loading={loading} className="w-full">
                  Update password
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-link inline-flex min-h-10 items-center">
                  &larr; Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </AuthShell>
    </main>
  );
}
