import Link from "next/link";
import { formatLocation } from "@/lib/format-location";
import type { PersonaOutcomeCard, PersonaOutcomes } from "@/lib/persona-outcomes";

const BADGE_STYLE: Record<PersonaOutcomeCard["badge"], string> = {
  reached: "border-[var(--severity-minor)] text-[var(--severity-minor)]",
  "text observed": "border-[var(--severity-minor)] text-[var(--severity-minor)]",
  blocked: "border-[var(--severity-critical)] text-[var(--severity-critical)]",
  "not verified": "border-foreground/50 text-muted-foreground",
};

function PersonaCard({ card, auditId }: { card: PersonaOutcomeCard; auditId: string }) {
  const ev = card.evidence;
  const stuck = card.goalCompleted === false;
  const where = formatLocation(ev?.pageUrl);
  return (
    <li className="flex flex-col border-[3px] border-foreground bg-card">
      <div className="flex items-start justify-between gap-3 bg-foreground px-3 py-2 text-background">
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-tight">{card.name}</p>
          <p className="text-sm leading-snug">{card.role}</p>
          {card.device ? (
            <p className="mt-0.5 font-mono text-xs leading-snug">{card.device}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-sm border bg-background px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide ${BADGE_STYLE[card.badge]}`}
        >
          {card.badge}
        </span>
      </div>

      {ev ? (
        <div className="border-b-2 border-foreground">
          <p className="border-b-2 border-foreground px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em]">
            {stuck ? "Where they got stuck" : "Where they finished"} · step {ev.step}
          </p>
          {ev.screenshotUrl ? (
            <div className="h-56 overflow-hidden bg-muted">
              {/* Signed, short-lived private URL: a plain img avoids next/image remote config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ev.screenshotUrl}
                alt={`${card.name}, step ${ev.step}${where ? ` on ${where}` : ""}`}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </div>
          ) : (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No screenshot was captured for this step.
            </p>
          )}
          {where ? (
            <p className="break-all px-3 py-1.5 font-mono text-xs text-muted-foreground">{where}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 space-y-2 px-3 py-3">
        {card.quotes.length > 0 ? (
          <ul className="space-y-2">
            {card.quotes.map((q) => (
              <li key={q} className="border-l-2 border-foreground/40 pl-3 text-sm leading-snug">
                <q>{q}</q>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ev
              ? "This persona recorded no commentary."
              : "No step-by-step journey was recorded for this persona."}
          </p>
        )}
      </div>

      {ev ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-foreground px-3 py-2 font-mono text-xs text-muted-foreground">
          <span>
            {card.steps} {card.steps === 1 ? "step" : "steps"} · effort {card.peakFrustration}
          </span>
          <Link
            href={`/audits/${auditId}?persona=${encodeURIComponent(card.personaId)}&step=${ev.index}`}
            className="rounded-sm text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Replay this walk
          </Link>
        </div>
      ) : null}
    </li>
  );
}

/**
 * The lead section of the audit page: what each AI persona did and said, who got stuck
 * where, and what this section is not. Usability opinion only. The axe scan further down
 * is the deterministic accessibility evidence.
 */
export function PersonaFirstReport({
  outcomes,
  auditId,
  nameOf,
}: {
  outcomes: PersonaOutcomes;
  auditId: string;
  nameOf: (personaId: string) => string;
}) {
  if (outcomes.cards.length === 0) return null;
  return (
    <section aria-labelledby="persona-first-heading" className="space-y-6">
      <div className="space-y-1.5">
        <p className="label-mono">Personas · AI opinion</p>
        <h2 id="persona-first-heading" className="display text-2xl leading-tight sm:text-3xl">
          {outcomes.headline}
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {outcomes.cards.map((c) => (
            <li key={c.personaId} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{c.name}</span>
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {c.badge}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {outcomes.cards.map((c) => (
          <PersonaCard key={c.personaId} card={c} auditId={auditId} />
        ))}
      </ul>

      {outcomes.stuckPoints.length > 0 ? (
        <div className="space-y-3">
          <h3 className="display text-xl leading-tight">Where personas got stuck</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pages ranked by how many personas were blocked or struggling there, then by how hard it
            was for them.
          </p>
          <ol className="sheet divide-y divide-border">
            {outcomes.stuckPoints.map((p, i) => (
              <li key={p.pageUrl} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3">
                <span className="font-mono text-sm font-bold tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 break-all font-mono text-xs">
                  {formatLocation(p.pageUrl)}
                </span>
                <span className="text-sm">
                  {p.personaIds.length} {p.personaIds.length === 1 ? "persona" : "personas"}
                  {p.blockedPersonaIds.length > 0 ? `, ${p.blockedPersonaIds.length} blocked` : ""}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  effort {p.peakFrustration}
                </span>
                <span className="basis-full pl-8 text-xs text-muted-foreground">
                  {p.personaIds.map(nameOf).join(", ")}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <aside aria-labelledby="persona-not-heading" className="border-2 border-foreground bg-card p-4">
        <h3 id="persona-not-heading" className="text-base font-extrabold">
          What this is not
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed">
          Persona output is usability opinion from AI personas browsing toward a goal. It is not an
          accessibility verdict, and no persona simulates a person with a disability. The axe scan
          further down the page is the deterministic accessibility evidence.
        </p>
      </aside>
    </section>
  );
}
