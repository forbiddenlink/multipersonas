import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { BoxDivider } from "@/components/forensic/divider";
import { updateAgencyNameAction } from "./actions";

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
    .select("plan,agency_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›&nbsp;</span>
        account · branding · security
      </p>

      <BoxDivider label="account" className="mt-8 mb-4" />
      <dl className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
          <dd className="truncate font-medium text-foreground">{user.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plan</dt>
          <dd>
            <Badge variant="secondary" className="rounded-sm capitalize">
              {profile?.plan ?? "free"}
            </Badge>
          </dd>
        </div>
      </dl>

      <BoxDivider label="report branding" className="mt-8 mb-4" />
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Shown as &ldquo;Prepared by&rdquo; on exported accessibility reports. Leave blank to
          keep the default Personaudit header.
        </p>
        <form
          action={updateAgencyNameAction}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="agencyName"
              className="block font-mono text-xs uppercase tracking-wide text-muted-foreground"
            >
              Agency name
            </label>
            <input
              id="agencyName"
              name="agencyName"
              type="text"
              maxLength={120}
              defaultValue={profile?.agency_name ?? ""}
              placeholder="Northwind Digital"
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Save
          </button>
        </form>
      </div>

      <BoxDivider label="security" className="mt-8 mb-4" />
      <div className="rounded-md border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Change the password you use to sign in.</p>
        <Link
          href="/auth/update-password"
          className="mt-3 inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Change password
        </Link>
      </div>

      <BoxDivider label="danger" className="mt-8 mb-4" />
      <div className="rounded-md border border-destructive/30 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Email us to delete your account and stored audit data.
        </p>
        <a
          href="mailto:support@personaudit.com?subject=Account%20deletion%20request"
          className="mt-3 inline-flex items-center justify-center rounded-sm border border-destructive/30 px-4 py-2 font-mono text-xs uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Delete account
        </a>
      </div>

      <BoxDivider label="session" className="mt-8 mb-4" />
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">End your session on this device.</p>
        <SignOutButton />
      </div>
    </div>
  );
}
