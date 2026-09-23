import type { Metadata } from "next";
import { AppNav } from "@/components/app-nav";
import { ClaimGrades } from "@/components/claim-grades";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defense in depth behind proxy.ts — if proxy env is unset or a route slips the
  // matcher, don't render the shell (and a live AuditForm) with empty RLS data.
  // Deep-link returnTo is normally set by the proxy; this fallback is enough to
  // bounce unauthenticated visitors to login.
  if (!user) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppNav userEmail={user.email ?? null} isAdmin={isAdminEmail(user.email)} />
      <main id="main" className="flex-1 p-6 md:p-8">
        <ClaimGrades />
        {children}
      </main>
    </div>
  );
}
