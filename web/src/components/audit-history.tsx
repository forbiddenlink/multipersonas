import Link from "next/link";
import type { AuditListItem } from "@/lib/audits";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";

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
      <EmptyPrompt
        prompt="no saved runs yet — point it at a URL above"
        hint="Signed-in scans land here so you can track which defects you’ve cleared over time."
      />
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
                ).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}, ${a.task_success_achieved ?? 0} of ${a.task_success_total ?? 0} ${a.task_definition ? "profiles matched the text check" : "personas reached their goal"}`}
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
                  <p className="text-xs text-muted-foreground">{a.task_definition ? "text observed" : "reached goal"}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
