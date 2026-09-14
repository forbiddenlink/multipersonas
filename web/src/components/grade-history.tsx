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
        prompt="no saved grades yet — run a free public grade and it will land here"
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
    <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
      <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">┌─ </span>
        saved grades
        <span className="ml-2 tabular-nums">{grades.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {grades.map((grade) => (
          <li key={grade.token}>
            <Link
              href={`/grade/${grade.token}`}
              aria-label={`View the public grade for ${hostname(grade.entry_url)}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <div className="min-w-0">
                <p className="truncate text-card-foreground">
                  <span className="select-none text-[var(--primary)]">›&nbsp;</span>
                  {hostname(grade.entry_url)}
                </p>
                <p className="truncate pl-3.5 text-xs text-muted-foreground">
                  {new Date(grade.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {grade.status}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums text-foreground">
                {grade.letter ?? "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
