import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { BoxDivider } from "@/components/forensic/divider";
import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/audits";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const audits = await listAudits(supabase);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Scan a public URL for accessibility defects and persona task-success. To scan behind
        your login, use the CLI — credentials stay on your machine.
      </p>

      <BoxDivider label="new scan" className="my-5" />

      <p className="mb-3 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›&nbsp;</span>
        point it at any public URL
      </p>
      <AuditForm />

      <BoxDivider label="recent runs" className="my-5" />

      <AuditHistory audits={audits} />
    </div>
  );
}
