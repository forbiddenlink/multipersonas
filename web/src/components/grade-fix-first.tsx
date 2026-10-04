import { SeverityChip } from "@/components/forensic/severity-chip";
import { rankFixFirst } from "@/lib/grade-fix-first";
import type { GradeRuleHit } from "@engine/grader/score";

/** Row anchor in the full findings list; GradeFindingRow renders the matching id. */
export const findingAnchor = (ruleId: string): string => `finding-${ruleId}`;

/**
 * The top of the result, after the grade: the few problems to fix first, in plain language,
 * with how far each one reaches. Ranking is pure (`rankFixFirst`). Who a problem blocks is
 * read off the rule's own text, so the copy says "inferred", never "simulated".
 */
export function GradeFixFirst({
  rules,
  pagesScanned,
}: {
  rules: GradeRuleHit[] | undefined;
  pagesScanned: number;
}) {
  const items = rankFixFirst(rules);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="fix-first-heading">
      <h2 id="fix-first-heading" className="label-mono">
        Fix these first
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Ranked by how serious each failure is and how many pages it touches. Who it affects is
        inferred from the rule, not simulated.
      </p>
      <ol className="mt-4 border-t-2 border-foreground">
        {items.map((item, i) => {
          const count = Math.min(item.pages.count, Math.max(pagesScanned, 1));
          return (
            <li key={item.ruleId} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-border py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
              <span aria-hidden="true" className="display text-3xl leading-none text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="display text-xl leading-snug sm:text-2xl">{item.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <SeverityChip severity={item.impact} />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    On {item.pages.exact ? "" : "at least "}
                    {count} of {Math.max(pagesScanned, count)} pages scanned
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed">{item.why}</p>
                {item.fix ? (
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Fix: </span>
                    {item.fix}
                  </p>
                ) : null}
                {item.shared ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed">
                    <span className="redline-note">Fix once, clears {item.shared.pages} pages.</span>{" "}
                    The same element fails on each of them, which usually means one shared component:{" "}
                    <code className="break-all font-mono text-xs">{item.shared.target}</code>
                  </p>
                ) : null}
                <p className="mt-2 text-sm">
                  <a href={`#${findingAnchor(item.ruleId)}`} className="text-link inline-flex min-h-11 items-center sm:min-h-0">
                    See the details{" "}
                    <span className="sr-only">for {item.title}</span>
                  </a>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
