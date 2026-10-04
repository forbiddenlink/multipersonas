import { SeverityChip } from "@/components/forensic/severity-chip";
import type { RunRegression } from "@/lib/baseline";
import { formatShortDate } from "@/lib/format";

/**
 * Project regression panel — newest run vs previous, axe verdicts only.
 * Same identity as the CLI gate (ruleId + normalized selector).
 */
export function RunDiff({ diff }: { diff: RunRegression }) {
  const hasPrevious = diff.previous != null;

  return (
    <div className="sheet overflow-hidden text-sm">
      <div className="border-b border-border px-4 py-2.5 label-mono">
        <span>Retest</span>
        {hasPrevious ? (
          <span className="ml-2 normal-case">
            {formatShortDate(diff.previous!.created_at)}
            <span className="mx-1.5">→</span>
            {formatShortDate(diff.current.created_at)}
          </span>
        ) : (
          <span className="ml-2 normal-case">first run, establishing baseline</span>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
        <div className="px-3 py-3">
          <p
            className="font-mono text-xl tabular-nums font-medium"
            style={{
              color:
                diff.newDefects.length > 0
                  ? "var(--severity-serious)"
                  : "var(--foreground)",
            }}
          >
            {diff.newDefects.length}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            new
          </p>
        </div>
        <div className="px-3 py-3">
          <p
            className="font-mono text-xl tabular-nums font-medium"
            style={{
              color:
                diff.cleared.length > 0
                  ? "var(--severity-minor)"
                  : "var(--foreground)",
            }}
          >
            {diff.cleared.length}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            fixed
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="font-mono text-xl tabular-nums font-medium text-foreground">
            {diff.unchangedCount}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            still open
          </p>
        </div>
      </div>

      {!hasPrevious ? (
        <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
          Run another scan on this project to see new versus fixed defects, using the
          same identity the CI gate uses. Builds only fail on regressions.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {diff.newDefects.length > 0 && (
            <ul className="divide-y divide-border">
              {diff.newDefects.slice(0, 12).map((f) => (
                <li key={f.key} className="flex items-start gap-3 px-4 py-2.5">
                  <span
                    className="mt-0.5 shrink-0 select-none text-[var(--severity-serious)]"
                    aria-hidden
                  >
                    +
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={f.severity} />
                      <span className="truncate text-card-foreground">{f.title}</span>
                    </div>
                    {f.ruleId ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {f.ruleId}
                        {f.target ? ` · ${f.target}` : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
              {diff.newDefects.length > 12 ? (
                <li className="px-4 py-2 text-xs text-muted-foreground">
                  +{diff.newDefects.length - 12} more new
                </li>
              ) : null}
            </ul>
          )}

          {diff.cleared.length > 0 && (
            <ul className="divide-y divide-border">
              {diff.cleared.slice(0, 8).map((f) => (
                <li key={f.key} className="flex items-start gap-3 px-4 py-2.5">
                  <span
                    className="mt-0.5 shrink-0 select-none text-[var(--severity-minor)]"
                    aria-hidden
                  >
                    −
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={f.severity} />
                      <span className="truncate text-muted-foreground line-through">
                        {f.title}
                      </span>
                    </div>
                    {f.ruleId ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {f.ruleId}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {diff.newDefects.length === 0 && diff.cleared.length === 0 ? (
            <p className="px-4 py-4 text-xs text-muted-foreground">
              No new or fixed axe verdicts versus the previous run.
            </p>
          ) : null}
        </div>
      )}

      {diff.identityPartial ? (
        <p className="border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Some stored findings lack element selectors (older runs). Re-scan to
          lock identity to the CLI gate key.
        </p>
      ) : null}
    </div>
  );
}
