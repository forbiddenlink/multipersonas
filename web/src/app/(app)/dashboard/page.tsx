import { AuditForm } from "@/components/audit-form";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Test your site with AI personas
      </p>

      <div className="mt-8 max-w-2xl">
        <AuditForm />
      </div>
    </div>
  );
}
