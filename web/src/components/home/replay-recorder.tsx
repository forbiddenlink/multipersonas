"use client";

import { useState } from "react";
import {
  AXE_LANE_FINDINGS,
  REPLAY_RUNS,
  REPLAY_SITE,
  REPLAY_STEP_BUDGET,
  matchesExpected,
  replayTally,
  type MomentKind,
} from "@/lib/sample-replay";
import { SAUCEDEMO_TRAIL } from "@/lib/probe-ledger";

/**
 * The home hero: a session-replay viewer over one stored set of persona runs, with the
 * deterministic axe-core scan of the same site as a second, separate lane. Data and its
 * honest limits are documented in lib/sample-replay.ts. Interaction is buttons only, with no
 * transitions or animation, so the hero stays still under reduced motion.
 */

const KIND_LABEL: Record<MomentKind, string> = {
  navigate: "Navigate",
  click: "Click",
  type: "Type",
  stuck: "Stuck",
  result: "Result",
};

// Glyphs repeat the word so colour is never the only cue.
const KIND_GLYPH: Record<MomentKind, string> = {
  navigate: "→",
  click: "◉",
  type: "⌨",
  stuck: "!",
  result: "■",
};

const DEFAULT_RUN = "apply-coupon";
const DEFAULT_MOMENT = 1;

export function ReplayRecorder() {
  const [runId, setRunId] = useState(DEFAULT_RUN);
  const [momentIdx, setMomentIdx] = useState(DEFAULT_MOMENT);
  const [stateIdx, setStateIdx] = useState(2);

  const run = REPLAY_RUNS.find((r) => r.id === runId) ?? REPLAY_RUNS[0]!;
  const moment = run.moments[Math.min(momentIdx, run.moments.length - 1)]!;
  const last = run.moments.length - 1;
  const atEnd = momentIdx >= last;
  const { matched, total } = replayTally();
  const crawlState = SAUCEDEMO_TRAIL[stateIdx]!;
  const axe = AXE_LANE_FINDINGS[crawlState.label] ?? null;

  const pick = (id: string) => {
    setRunId(id);
    const next = REPLAY_RUNS.find((r) => r.id === id);
    // Open each run on its first stuck moment when it has one, else its first moment.
    const stuck = next?.moments.findIndex((m) => m.kind === "stuck") ?? -1;
    setMomentIdx(stuck >= 0 ? stuck : 0);
  };

  return (
    <figure className="pa-rec" aria-labelledby="rec-title">
      <figcaption className="pa-rec-bar">
        <span className="pa-rec-dot" aria-hidden="true" />
        <span id="rec-title" className="pa-rec-title">
          Persona replay
        </span>
        <span className="pa-rec-tag">Sample: stored run, not your site</span>
      </figcaption>

      <div className="pa-rec-goal">
        <p className="pa-rec-goal-label">Goal given to the persona</p>
        <p className="pa-rec-goal-text" aria-live="polite">
          {run.goal}
        </p>
        <p className="pa-rec-goal-site">
          On {REPLAY_SITE}. The goal was written before the run, with the known answer:{" "}
          <strong>{run.reachable ? "this can be done on the site" : "this cannot be done on the site"}</strong>.
        </p>
      </div>

      <div className="pa-rec-grid">
        {/* Lane 1: persona task runs. */}
        <section className="pa-lane pa-lane-persona" aria-labelledby="lane-persona">
          <h2 id="lane-persona" className="pa-lane-head">
            <span>Lane 1 · Persona task runs</span>
            <span className="pa-lane-note">AI opinion about whether the goal can be done</span>
          </h2>

          <div className="pa-rec-split">
            <div className="pa-runs-col">
              <ul className="pa-runs" aria-label="Stored persona runs">
                {REPLAY_RUNS.map((r) => {
                  const ok = r.verdict === "achieved";
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="pa-run"
                        aria-pressed={r.id === runId}
                        onClick={() => pick(r.id)}
                      >
                        <span className="pa-run-mark" data-ok={ok ? "1" : "0"} aria-hidden="true">
                          {ok ? "✓" : "✗"}
                        </span>
                        <span className="pa-run-goal">{r.goal}</span>
                        <span className="pa-run-verdict" data-ok={ok ? "1" : "0"}>
                          {ok ? "Achieved" : "Blocked"}
                        </span>
                        <span className="pa-run-steps">
                          <span className="pa-run-bar" aria-hidden="true">
                            <span style={{ width: `${(r.steps / REPLAY_STEP_BUDGET) * 100}%` }} />
                          </span>
                          <span className="pa-mono">
                            {r.steps}/{REPLAY_STEP_BUDGET} steps
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="pa-rec-fine">
                {matched} of {total} verdicts matched the known answer. This is one stored sample run against saucedemo, not a general accuracy figure. The one miss, sorting by
                price, ran all {REPLAY_STEP_BUDGET} steps without finishing.
              </p>
            </div>

            <div className="pa-viewer">
              {/* Scrubber: the steps the persona narrated, in order. */}
              <ol className="pa-scrub" aria-label="Steps the persona narrated, in order">
                {run.moments.map((m, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="pa-stop"
                      data-kind={m.kind}
                      aria-pressed={i === momentIdx}
                      aria-label={`Step ${i + 1} of ${run.moments.length}: ${KIND_LABEL[m.kind]}`}
                      onClick={() => setMomentIdx(i)}
                    >
                      <span className="pa-stop-glyph" aria-hidden="true">
                        {KIND_GLYPH[m.kind]}
                      </span>
                      <span className="pa-stop-kind">{KIND_LABEL[m.kind]}</span>
                    </button>
                  </li>
                ))}
                <li className="pa-scrub-end" data-ok={run.verdict === "achieved" ? "1" : "0"}>
                  <span className="pa-stop-glyph" aria-hidden="true">
                    {run.verdict === "achieved" ? "✓" : "✗"}
                  </span>
                  <span>{run.verdict === "achieved" ? "Achieved" : "Blocked"}</span>
                </li>
              </ol>

              <div className="pa-screen">
                <div className="pa-screen-url">
                  <span className="pa-mono">{moment.page ?? "page not named in the stored summary"}</span>
                </div>
                <div className="pa-screen-body" aria-live="polite">
                  <p className="pa-screen-kind" data-kind={moment.kind}>
                    <span aria-hidden="true">{KIND_GLYPH[moment.kind]}</span> {KIND_LABEL[moment.kind]}
                    <span className="pa-screen-pos">
                      {" "}
                      · step {Math.min(momentIdx, last) + 1} of {run.moments.length} narrated
                    </span>
                  </p>
                  <blockquote className="pa-screen-said">
                    <p>&ldquo;{moment.said}&rdquo;</p>
                    <footer>The persona&apos;s own words, from its stored summary</footer>
                  </blockquote>
                </div>
              </div>

              <div className="pa-result" data-ok={run.verdict === "achieved" ? "1" : "0"} data-reached={atEnd ? "1" : "0"}>
                <p className="pa-result-line">
                  <span className="pa-result-label">Task result</span>
                  <strong>{run.verdict === "achieved" ? "Achieved" : "Blocked"}</strong>
                  <span className="pa-mono">
                    after {run.steps} of {REPLAY_STEP_BUDGET} steps
                  </span>
                </p>
                <p className="pa-result-sub">
                  {matchesExpected(run) ? "Matches the known answer." : "Does not match the known answer: the control exists."}
                  {run.noFinish ? " The stored run ends with no explicit finish." : ""}
                </p>
              </div>

              <p className="pa-rec-fine">
                The stored run keeps each persona&apos;s step count and written summary, not a
                recording or a page capture per step. These steps are the ones the persona
                described, quoted as written.
              </p>
            </div>
          </div>
        </section>

        {/* Lane 2: axe-core. A different instrument on the same site. */}
        <section className="pa-lane pa-lane-axe" aria-labelledby="lane-axe">
          <h2 id="lane-axe" className="pa-lane-head">
            <span>Lane 2 · axe-core scan</span>
            <span className="pa-lane-note">Deterministic. Same answer every run</span>
          </h2>
          <p className="pa-axe-lede">
            A separate crawl of the same site. Six states it reached, in order. Personas do not
            produce these findings.
          </p>
          <ol className="pa-axe-states" aria-label="States the axe-core crawl reached">
            {SAUCEDEMO_TRAIL.map((s, i) => (
              <li key={s.path}>
                <button
                  type="button"
                  className="pa-axe-state"
                  data-hit={s.findings > 0 ? "1" : "0"}
                  aria-pressed={i === stateIdx}
                  onClick={() => setStateIdx(i)}
                >
                  <span className="pa-axe-name">
                    <span className="pa-axe-glyph" aria-hidden="true">
                      {s.findings > 0 ? "✗" : "✓"}
                    </span>
                    {s.label}
                  </span>
                  <span className="pa-axe-count">
                    {s.findings} {s.findings === 1 ? "finding" : "findings"}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="pa-axe-readout" aria-live="polite">
            <p className="pa-mono pa-axe-path">{crawlState.path}</p>
            {axe ? (
              <p className="pa-axe-finding">
                <span className="pa-axe-sev">Critical</span> <span className="pa-mono">{axe.ruleId}</span> · WCAG{" "}
                {axe.wcag}. {axe.help}.
              </p>
            ) : (
              <p className="pa-axe-finding">No findings in this state.</p>
            )}
            <p className="pa-axe-why">{crawlState.why}</p>
          </div>
          <p className="pa-rec-fine">
            Sample scan of the same public demo store. It is a different run from lane 1, so the
            two are not matched up here. Behind-login states are scanned with the free CLI.
          </p>
        </section>
      </div>
    </figure>
  );
}
