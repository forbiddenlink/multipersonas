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
        prompt="No saved runs yet."
        hint="Point a URL at the form above and your first scan lands here, so you can track what you've cleared over time."
      />
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Recent runs table"
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      <table className="w-full min-w-[19rem] border-collapse sm:min-w-[30rem] text-left text-sm">
        <caption className="sr-only">Recent audit runs by host, date, and persona task success</caption>
        <thead>
          <tr className="border-b-2 border-foreground">
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Host
            </th>
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Date
            </th>
            <th scope="col" className="hidden py-2 pr-4 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
              Personas
            </th>
            <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Task success
            </th>
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => {
            const tone = successTone(a.task_success_achieved, a.task_success_total);
            const color = tone ? `var(--severity-${tone})` : undefined;
            return (
              <tr key={a.id} className="border-b border-border">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <Link
                    href={`/audits/${a.id}`}
                    aria-label={`View details for the audit of ${hostname(a.url)} on ${new Date(
                      a.created_at,
                    ).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}, ${a.task_success_achieved ?? 0} of ${a.task_success_total ?? 0} ${a.task_definition ? "profiles matched the text check" : "personas reached their goal"}`}
                    className="text-link truncate"
                  >
                    {hostname(a.url)}
                  </Link>
                </th>
                <td className="py-3 pr-4 text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="hidden py-3 pr-4 text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                  {a.persona_ids.length}
                </td>
                <td className="py-3 text-right">
                  <span
                    className={`font-mono font-medium tabular-nums ${color ? "" : "text-muted-foreground"}`}
                    style={color ? { color } : undefined}
                  >
                    {a.task_success_achieved ?? 0}
                    <span className="text-muted-foreground">/{a.task_success_total ?? 0}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
