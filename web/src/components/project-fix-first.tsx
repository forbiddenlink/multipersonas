import Link from "next/link";
import { SeverityChip } from "@/components/forensic/severity-chip";
import type { FixFirstItem } from "@/lib/grade-fix-first";

/**
 * The top fixes from a project's latest free grade, compact. The ranked items come from
 * `rankFixFirst` (the same ranking as the grade result page); the full write-up stays on
 * that page, so each item links there instead of anchoring into a list this page lacks.
 */
export function ProjectFixFirst({
  host,
  token,
  items,
  pagesScanned,
}: {
  host: string;
  token: string;
  items: FixFirstItem[];
  pagesScanned: number;
}) {
  const gradeHref = `/grade/${token}`;
  if (items.length === 0) {
    return (
      <p className="text-sm">
        <Link href={gradeHref} className="text-link">
          Open your latest grade of {host}
        </Link>
      </p>
    );
  }
  return (
    <section aria-labelledby="project-fix-first-heading">
      <h2 id="project-fix-first-heading" className="label-mono">
        Fix these first on {host}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">From your latest free grade of this site.</p>
      <ol className="mt-3 border-t-2 border-foreground">
        {items.map((item) => {
          const count = Math.min(item.pages.count, Math.max(pagesScanned, 1));
          return (
            <li key={item.ruleId} className="border-b border-border py-3">
              <p className="font-medium leading-snug">{item.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <SeverityChip severity={item.impact} />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  On {item.pages.exact ? "" : "at least "}
                  {count} of {Math.max(pagesScanned, count)} pages scanned
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm">
        <Link href={gradeHref} className="text-link">
          Open the full grade for {host}
        </Link>
      </p>
    </section>
  );
}
