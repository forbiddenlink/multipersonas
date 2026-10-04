import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { BoxDivider } from "@/components/forensic/divider";
import { updateAgencyNameAction } from "./actions";
import { planAllowsReportBranding, planDisplayName, planUpgradeSummary } from "@/lib/entitlements";
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
  const reportBrandingAllowed = planAllowsReportBranding(profile?.plan);
  const hasBillingCustomer = Boolean(profile?.stripe_customer_id?.trim());

  return (
    <div className="max-w-2xl">
      <ExhibitHead label="Account" className="mb-5" />
      <h1 className="display text-2xl leading-tight text-foreground">Settings</h1>

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
      {error === "agency-plan" ? (
        <p role="alert" className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          White-label report headers need agency access. Your report still exports with the
          Personaudit header.
        </p>
      ) : null}

      <BoxDivider label="plan and billing" className="mt-8 mb-4" />
      <div className="sheet p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="label-mono">Current plan</p>
          <Badge variant="secondary" className="rounded-sm">
            {planDisplayName(profile?.plan)}
          </Badge>
        </div>

        {checkout === "success" ? (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {profile?.plan === "pro" || profile?.plan === "team"
              ? "Your account has paid access."
              : "Your plan has not been updated yet. Refresh this page shortly. If you completed payment and access is still missing, contact billing support below before trying another checkout."}
          </p>
        ) : null}

        {(profile?.plan ?? "free") === "free" && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Free keeps the public grade, the CLI and one hosted project. {planUpgradeSummary()}{" "}
            <Link href="/pricing" className="text-link">
              See pricing
            </Link>
            .
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          For a refund request,{" "}
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@personaudit.com"}?subject=Personaudit%20billing%20support`}
            className="text-link"
          >
            contact billing support
          </a>
          . A refund request does not by itself cancel a subscription.
          {hasBillingCustomer
            ? " Payment changes, invoices, and cancellation open in Stripe."
            : " Cancellation currently starts with that email."}
        </p>
        {hasBillingCustomer ? <ManageBillingButton /> : null}
      </div>

      <BoxDivider label="agency name" className="mt-8 mb-4" />
      <div className="sheet p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Shown as &ldquo;Prepared by&rdquo; on exported accessibility reports. Leave blank to
          keep the default Personaudit header.
        </p>
        {!reportBrandingAllowed ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            White-label report headers are part of agency access.{" "}
            <Link href="/pricing" className="text-link">
              See pricing
            </Link>
            .
          </p>
        ) : (
          <form
            action={updateAgencyNameAction}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="agencyName" className="label-mono block">
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
            <SubmitButton variant="outline" size="sm">
              Save
            </SubmitButton>
          </form>
        )}
      </div>

      <BoxDivider label="account" className="mt-8 mb-4" />
      <div className="sheet p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="label-mono">Email</p>
          <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Change the password you use to sign in.</p>
          <Link
            href="/auth/update-password"
            className="shrink-0 rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Change password
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">End your session on this device.</p>
          <SignOutButton />
        </div>
      </div>

      <BoxDivider label="danger zone" className="mt-8 mb-4" />
      <div className="rounded-sm border-2 border-destructive/40 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Email us to delete your account and stored audit data. This cannot be undone.
        </p>
        <a
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@personaudit.com"}?subject=Account%20deletion%20request`}
          className="mt-3 inline-flex items-center justify-center rounded-sm border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Delete account
        </a>
      </div>
    </div>
  );
}
