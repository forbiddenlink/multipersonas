import { formatLocation } from "@/lib/format-location";
import type { StuckPoint } from "@/lib/persona-outcomes";

/**
 * Ranked stuck points as plain text rows with a glyph. Derived by rankStuckPoints from the
 * recorded journeys: usability opinion from AI personas, never an accessibility verdict.
 */
export function StuckPoints({
  points,
  nameOf,
}: {
  points: StuckPoint[];
  nameOf: (personaId: string) => string;
}) {
  if (points.length === 0) return null;
  return (
    <section aria-labelledby="stuck-heading" className="space-y-2">
      <h2 id="stuck-heading" className="display text-xl leading-tight">
        Stuck points, ranked
      </h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Pages ranked by how many personas were blocked or struggling there, then by task effort.
        AI opinion.
      </p>
      <ol className="divide-y divide-border border-y border-border">
        {points.map((p, i) => {
          const blocked = p.blockedPersonaIds.length;
          return (
            <li
              key={p.pageUrl}
              className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-1 py-2.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] ${
                blocked > 0 ? "bg-[color-mix(in_oklch,var(--severity-critical)_7%,transparent)]" : ""
              }`}
            >
              <span className="font-mono text-sm font-bold tabular-nums">{i + 1}</span>
              <span className="min-w-0 break-all font-mono text-[13px]">
                <span aria-hidden="true" className={blocked > 0 ? "text-[var(--severity-critical)]" : ""}>
                  {blocked > 0 ? "⚑ " : "↻ "}
                </span>
                {formatLocation(p.pageUrl)}
              </span>
              <span className="col-start-2 text-sm sm:col-start-3 sm:text-right">
                {p.personaIds.length} {p.personaIds.length === 1 ? "persona" : "personas"}
                {blocked > 0 ? `, ${blocked} blocked` : ""}
                <span className="text-muted-foreground"> · effort {p.peakFrustration}</span>
              </span>
              <span className="col-start-2 text-[13px] text-muted-foreground sm:col-span-2">
                {p.personaIds.map(nameOf).join(", ")}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
