import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isFoundingCheckoutOpen } from "@/lib/founding-checkout";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { BoxDivider } from "@/components/forensic/divider";
import { updateAgencyNameAction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { ManageBillingButton } from "@/components/manage-billing-button";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; checkout?: string }>;
}) {
  const { error, saved, checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,agency_name,stripe_customer_id")
    .eq("id", user.id)
    .single();
  const foundingAccessOpen = isFoundingCheckoutOpen();
  const hasBillingCustomer = Boolean(profile?.stripe_customer_id?.trim());

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›&nbsp;</span>
        account · branding · security
      </p>

      {saved === "agency" ? (
        <p role="status" className="mt-4 rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground">
          Agency name saved.
        </p>
      ) : null}
      {error === "agency" ? (
        <p role="alert" className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Couldn&apos;t save the agency name. Try again.
        </p>
      ) : null}

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

      {checkout === "success" ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {profile?.plan === "pro" || profile?.plan === "team"
            ? "Your account has paid access."
            : "Your plan has not been updated yet. Refresh this page shortly. If you completed payment and access is still missing, contact billing support below before trying another checkout."}
        </p>
      ) : null}

      <p className="mt-3 text-sm text-muted-foreground">
        For a refund request,{" "}
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@personaudit.com"}?subject=Personaudit%20billing%20support`}
          className="text-foreground underline underline-offset-4"
        >
          contact billing support
        </a>
        . A refund request does not by itself cancel a subscription.
        {hasBillingCustomer
          ? " Payment changes, invoices, and cancellation open in Stripe."
          : " Cancellation currently starts with that email."}
      </p>
      {hasBillingCustomer ? <ManageBillingButton /> : null}

      {(profile?.plan ?? "free") === "free" && (
        <p className="mt-3 text-sm text-muted-foreground">
          {foundingAccessOpen
            ? "Founding access unlocks persona task-success runs. The free plan keeps the deterministic accessibility scan."
            : "Founding access is opening soon. The free plan keeps the deterministic accessibility scan; founding access adds persona task-success runs."}{" "}
          <Link
            href="/for-agencies#early-access"
            className="text-foreground underline underline-offset-4"
          >
            See founding access
          </Link>
          .
        </p>
      )}

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
          <SubmitButton variant="outline" size="sm" className="font-mono uppercase tracking-wide">
            Save
          </SubmitButton>
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
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@personaudit.com"}?subject=Account%20deletion%20request`}
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
