import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSharedReport } from "@/lib/shared-report";
import { ReportDocument } from "@/app/(app)/audits/[id]/report/report-document";

// A share link is a capability URL. Never cache it, never index it, never send it as a
// referrer. The same three are also set as response headers in next.config.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accessibility report",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Unknown, malformed, revoked and expired tokens all resolve to null, and all render the
  // same "link no longer active" page, so a visitor learns nothing about which it was.
  const report = await loadSharedReport(supabase, token);
  if (!report) notFound();

  return (
    <main id="main" className="px-4 py-6 sm:py-10">
      <p className="report-print-hide mx-auto mb-4 max-w-[60rem] text-sm text-muted-foreground">
        Shared report. This page is read-only.
      </p>
      {/* Run history and schedules belong to the owner's project and are not shared. */}
      <ReportDocument report={report} regression={null} schedule={null} />
    </main>
  );
}
