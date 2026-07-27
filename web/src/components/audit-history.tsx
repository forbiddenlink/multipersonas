import type { AuditListItem } from "@/lib/audits";

function successColor(achieved: number | null, total: number | null): string {
  if (total == null || total === 0 || achieved == null) return "text-muted-foreground";
  const pct = achieved / total;
  if (pct >= 0.8) return "text-green-400";
  if (pct >= 0.5) return "text-yellow-400";
  return "text-red-400";
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
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">No saved audits yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run an audit above and it&apos;ll be saved here so you can track which defects
          you&apos;ve cleared over time.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {audits.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{hostname(a.url)}</p>
            <p className="truncate text-xs text-muted-foreground">
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
            <span className={`text-sm font-bold tabular-nums ${successColor(a.task_success_achieved, a.task_success_total)}`}>
              {a.task_success_achieved ?? 0}
              <span className="text-muted-foreground">/{a.task_success_total ?? 0}</span>
            </span>
            <p className="text-xs text-muted-foreground">reached goal</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
