import Link from "next/link";
import type { AuditListItem } from "@/lib/audits";

// Task-success is a fraction of real-shaped users, not a compliance verdict — this
// borrows the same red/amber/green ramp the shared Meter component uses for the same
// non-axe metric (see forensic/meter.tsx `tone`), not the axe SeverityChip vocabulary.
function successTone(
  achieved: number | null,
  total: number | null,
): "minor" | "moderate" | "critical" | null {
  if (total == null || total === 0 || achieved == null) return null;
  const pct = achieved / total;
  if (pct >= 0.8) return "minor";
  if (pct >= 0.5) return "moderate";
  return "critical";
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AuditHistory({ audits }: { audits: AuditListItem[] }) {
  if (audits.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">No saved audits yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run an audit above and it&apos;ll be saved here so you can track which defects
          you&apos;ve cleared over time.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
      <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">┌─ </span>
        recent runs
        <span className="ml-2 tabular-nums text-muted-foreground">{audits.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {audits.map((a) => {
          const tone = successTone(a.task_success_achieved, a.task_success_total);
          const color = tone ? `var(--severity-${tone})` : undefined;
          return (
            <li key={a.id}>
              <Link
                href={`/audits/${a.id}`}
                aria-label={`View details for the audit of ${hostname(a.url)} on ${new Date(
                  a.created_at,
                ).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}, ${a.task_success_achieved ?? 0} of ${a.task_success_total ?? 0} personas reached their goal`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-card-foreground">
                    <span className="select-none text-[var(--primary)]">›&nbsp;</span>
                    {hostname(a.url)}
                  </p>
                  <p className="truncate pl-3.5 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {a.persona_ids.length} persona{a.persona_ids.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`font-medium tabular-nums ${color ? "" : "text-muted-foreground"}`}
                    style={color ? { color } : undefined}
                  >
                    {a.task_success_achieved ?? 0}
                    <span className="text-muted-foreground">/{a.task_success_total ?? 0}</span>
                  </span>
                  <p className="text-xs text-muted-foreground">reached goal</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
