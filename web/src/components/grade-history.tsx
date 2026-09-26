import Link from "next/link";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import type { ClaimedGrade } from "@/lib/grade";

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function GradeHistory({ grades }: { grades: ClaimedGrade[] }) {
  if (grades.length === 0) {
    return (
      <EmptyPrompt
        prompt="No saved grades yet. Run a free public grade and it lands here."
        hint="Sign up after a grade, or run one while signed in. Behind-login scans stay in the CLI."
        action={
          <Link
            href="/grade"
            className="inline-flex rounded-sm border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Run a free grade
          </Link>
        }
      />
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Saved grades table"
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
        <caption className="sr-only">Saved grades by host, date, status, and letter grade</caption>
        <thead>
          <tr className="border-b-2 border-foreground">
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Host
            </th>
            <th scope="col" className="hidden py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
              Date
            </th>
            <th scope="col" className="hidden py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
              Status
            </th>
            <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Grade
            </th>
          </tr>
        </thead>
        <tbody>
          {grades.map((grade) => (
            <tr key={grade.token} className="border-b border-border">
              <th scope="row" className="py-3 pr-4 font-normal">
                <Link
                  href={`/grade/${grade.token}`}
                  aria-label={`View the public grade for ${hostname(grade.entry_url)}`}
                  className="text-link truncate"
                >
                  {hostname(grade.entry_url)}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                  {new Date(grade.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {grade.status}
                </p>
              </th>
              <td className="hidden py-3 pr-4 text-xs text-muted-foreground sm:table-cell">
                {new Date(grade.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="hidden py-3 pr-4 text-xs text-muted-foreground sm:table-cell">
                {grade.status}
              </td>
              <td className="py-3 text-right font-mono font-medium tabular-nums text-foreground">
                {grade.letter ?? "not graded"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
