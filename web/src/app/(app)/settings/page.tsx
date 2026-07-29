import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Manage your account</p>

      <div className="mt-8 space-y-4">
        {/* Account */}
        <section className="rounded-md border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Account</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="truncate font-mono text-sm font-medium text-foreground">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Plan</dt>
              <dd>
                <Badge variant="secondary" className="rounded-sm capitalize">
                  {profile?.plan ?? "free"}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        {/* Security */}
        <section className="rounded-md border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Security</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Change the password you use to sign in.
          </p>
          <Link
            href="/auth/update-password"
            className="mt-3 inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Change password
          </Link>
        </section>

        {/* Session */}
        <section className="flex items-center justify-between rounded-md border border-border bg-card p-5">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Sign out</h2>
            <p className="mt-1 text-sm text-muted-foreground">End your session on this device.</p>
          </div>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}
