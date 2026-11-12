import { Placard } from "@/components/home/placard";
import { PROBE_LEDGER, SAUCEDEMO_TRAIL } from "@/lib/probe-ledger";
import { publicScanLetter } from "@/lib/home-placard";

const SAUCE = PROBE_LEDGER.find((r) => r.host === "saucedemo.com")!;

// Switches the scroll-driven version on before first paint, only where the browser can run it
// and the visitor has not asked for reduced motion. Without it the stage is the finished frame.
const ENHANCE =
  "(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(!CSS.supports('animation-timeline: view()'))return;document.documentElement.setAttribute('data-door','scroll');}catch(e){}})();";

const hits = (n: number) => `${n} ${n === 1 ? "issue" : "issues"}`;

/**
 * Signature move. A pinned stage (about three screen heights of scroll) in four frames:
 * 1 the placard shows the saucedemo.com public-scan grade, 2 the kitchen door swings open,
 * 3 the crawl states behind it appear one by one with their issue counts, 4 the net-new
 * tally lands on the door with the tag "Public scan missed these."
 *
 * The ledger gives counts but no per-impact breakdown or pass counts for the signed-in
 * states, so the engine cannot compute a letter for them. The page therefore never changes
 * the letter: frame 4 keeps the public-scan A and adds the scope note instead.
 */
export function DoorStage() {
  const letter = publicScanLetter(SAUCE);
  const behind = SAUCEDEMO_TRAIL.reduce((n, s) => n + s.findings, 0);
  // The ledger row and the trail are two copies of the same probe; show nothing if they disagree.
  const consistent = behind === SAUCE.netNew;

  return (
    <section id="inspection" aria-labelledby="door-heading" className="pa-track">
      <script dangerouslySetInnerHTML={{ __html: ENHANCE }} />
      <div className="pa-stage frame">
        <div className="min-w-0">
          <p className="pa-kicker">Same site, two looks</p>
          <h2 id="door-heading" className="pa-h mt-3 text-[clamp(2.4rem,5vw,4rem)]">
            The window says A. The kitchen door says otherwise.
          </h2>
          <ol className="pa-captions">
            <li>
              <span>
                The window shows saucedemo.com&apos;s public scan: {letter ? `grade ${letter}, ` : ""}
                {hits(SAUCE.publicScan)}.
              </span>
            </li>
            <li>
              <span>The kitchen door is the login. It swings open.</span>
            </li>
            <li>
              <span>
                {SAUCE.states} states sit behind it ({SAUCEDEMO_TRAIL.length - 1} shown). A URL scanner
                loads only the first.
              </span>
            </li>
            <li>
              <span>
                {consistent ? `${behind} net-new issues` : "New issues"}, found only behind the login.
                The public scan missed these.
              </span>
            </li>
          </ol>
        </div>

        <div className="pa-wall min-w-0">
          <div className="pa-wall-window">
            {letter ? (
              <Placard
                letter={letter}
                head="Public scan"
                foot={
                  <div className="pa-foot-wrap">
                    <span className="pa-foot-before">
                      saucedemo.com
                      <br />
                      {hits(SAUCE.publicScan)}
                    </span>
                    <span className="pa-foot-after">
                      Public page only.
                      <br />
                      {SAUCE.states} states not on this grade.
                    </span>
                  </div>
                }
              />
            ) : null}
          </div>

          <div className="pa-doorway">
            <ol className="pa-states" aria-label={`The entry page and ${SAUCEDEMO_TRAIL.length - 1} of the ${SAUCE.states} states the crawl reached on saucedemo.com`}>
              {SAUCEDEMO_TRAIL.map((s) => (
                <li key={s.path} className="pa-state">
                  <span>
                    <span className="pa-state-label">{s.label}</span>
                    <span className="pa-state-path">
                      {s.path}
                      {s.publicUrl ? " (public URL)" : ""}
                    </span>
                  </span>
                  <span className="pa-count" data-hit={s.findings > 0 ? "1" : "0"}>
                    {hits(s.findings)}
                  </span>
                </li>
              ))}
            </ol>
            {consistent ? (
              <p className="pa-tally">
                <strong>+{behind}</strong>
                <span>net new</span>
              </p>
            ) : null}
            <p className="pa-tag">Public scan missed these.</p>
            <div className="pa-door" aria-hidden="true">
              <div className="pa-hinges">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
