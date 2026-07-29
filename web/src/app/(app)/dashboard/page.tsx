import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/audits";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const audits = await listAudits(supabase);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Scan a public URL for accessibility defects and persona task-success. To scan behind your login, use the CLI — credentials stay on your machine.
      </p>

      <div className="mt-8 max-w-2xl">
        <p className="mb-3 font-mono text-xs text-muted-foreground">
          <span className="select-none text-[var(--primary)]">›&nbsp;</span>new scan — point it at any public URL
        </p>
        <AuditForm />
      </div>

      <section className="mt-12 max-w-2xl">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent audits</h2>
        <AuditHistory audits={audits} />
      </section>
    </div>
  );
}
