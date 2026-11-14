import { PERSONA_DATA } from "@/lib/personas";
import { SAMPLE_REPLAY_FRAMES, SAMPLE_RUN, sampleRunTally } from "@/lib/sample-evidence";
import { FrameViewport } from "@/components/dossier/sample-task-success";

/**
 * The home hero's visual: one goal, five personas, a verdict, and the stuck moment with the
 * persona's own words. Everything here is a labelled example (see `SAMPLE_RUN`). The
 * screenshot is a drawing of one SauceDemo probe state, not a captured image, and the
 * caption says so. Nothing here is an accessibility verdict: the stuck persona reports what
 * confused it, in its own words, and axe-core's findings live elsewhere.
 */
export function SampleStuckMoment({ className = "" }: { className?: string }) {
  const { reached, total } = sampleRunTally();
  const stuck = SAMPLE_RUN.personas[0];
  const persona = PERSONA_DATA[stuck.id];
  const frame = SAMPLE_REPLAY_FRAMES[2];

  return (
    <figure className={`sheet min-w-0 ${className}`} aria-labelledby="stuck-caption">
      <figcaption id="stuck-caption" className="border-b-2 border-foreground px-4 py-3 sm:px-5">
        <span className="label-mono">Example run, not a customer result</span>
        <span className="mt-1 block text-base">
          Goal: {SAMPLE_RUN.goal.toLowerCase()}, on an {SAMPLE_RUN.site.toLowerCase()}.
        </span>
      </figcaption>

      <div className="px-4 pt-4 sm:px-5">
        <p className="display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05]">
          {reached} of {total} personas checked out.
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          Here is where {persona.name}, a first-time visitor, stopped.
        </p>
      </div>

      <div className="mt-4 px-4 sm:px-5">
        <div className="overflow-hidden border-2 border-foreground">
          <FrameViewport index={2} />
        </div>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          Drawn from one state of the SauceDemo probe. A real run attaches the screenshot it took at the stuck step.
        </p>
      </div>

      <blockquote className="m-4 mt-4 rounded-sm bg-muted px-4 py-3 sm:mx-5">
        <p className="text-xl font-extrabold leading-snug">&ldquo;{frame.thought}&rdquo;</p>
        <footer className="mt-2 text-sm text-muted-foreground">
          {persona.name}, step {frame.step} of {SAMPLE_REPLAY_FRAMES.length}. AI opinion, labeled as such.
        </footer>
      </blockquote>
    </figure>
  );
}

/** Who got through and who stalled, one row per persona, with their words for the ones that stalled. */
export function SampleRunLedger({ className = "" }: { className?: string }) {
  const { reached, total } = sampleRunTally();
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Sample run results table"
      className={`min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${className}`}
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-3 text-left text-base leading-relaxed">
          <span className="font-bold">Example:</span> goal &ldquo;{SAMPLE_RUN.goal.toLowerCase()}&rdquo;,{" "}
          {reached} of {total} reached it. Not a real site.
        </caption>
        <thead>
          <tr className="border-b-2 border-foreground">
            <th scope="col" className="py-2 pr-4 text-[13px] font-normal text-muted-foreground">Persona</th>
            <th scope="col" className="py-2 pr-4 text-[13px] font-normal text-muted-foreground">Result</th>
            <th scope="col" className="py-2 text-[13px] font-normal text-muted-foreground">In their words</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_RUN.personas.map((p) => {
            const persona = PERSONA_DATA[p.id];
            const isStuck = p.outcome === "stuck";
            return (
              <tr key={p.id} className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="font-bold">{persona.name}</span>
                  <span className="block text-xs text-muted-foreground">{persona.role}</span>
                </th>
                <td className="py-3 pr-4">
                  <span className={`text-[13px] font-bold ${isStuck ? "text-[var(--redline)]" : ""}`}>
                    <span aria-hidden="true">{isStuck ? "✕ " : "✓ "}</span>
                    {isStuck ? "Stuck" : "Reached it"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.where}</span>
                </td>
                <td className="py-3 leading-relaxed">
                  {p.opinion ? <>&ldquo;{p.opinion}&rdquo;</> : <span className="text-muted-foreground">Nothing to flag.</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
