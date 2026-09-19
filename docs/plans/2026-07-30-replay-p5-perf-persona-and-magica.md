# Replay Theater P5 — perf persona (lighthouse) + magica decision

Written 2026-07-30. Scoping note for the two enrichment ideas in §P5 of the (now-shipped
and removed) Persona Replay Theater design doc. No em dashes.

## 1. Lighthouse "slow-3G mobile" performance lens — BUILD (own slice, not this session)

**Verdict: worth building, as a new deterministic lens, NOT as a walking persona.**

A performance signal is a *measured fact* (Core Web Vitals), same tier as axe: deterministic,
citable, a verdict. It does not "walk" a site like a persona, so modeling it as a persona
would blur the honesty wall. Model it as a third finding source alongside `axe` and
`persona`: `source = 'perf'`.

Feasibility is proven. A real dogfood run this session (lighthouse, mobile emulation +
throttling on) against personaudit.com:

| Metric | Value | Score |
| ------ | ----- | ----- |
| Performance | 0.88 | |
| First Contentful Paint | 1.7 s | 0.92 |
| Largest Contentful Paint | **3.7 s** | **0.57** |
| Total Blocking Time | 60 ms | 1.0 |
| Cumulative Layout Shift | 0 | 1.0 |

So the lens produces honest, real numbers today. (Side signal for Liz: our own LCP at 3.7s
on throttled mobile is the one weak metric — worth a look independent of this feature.)

### Scope to build (separate PR)
- **Runtime:** the `lighthouse` npm library run in the Railway worker (it already runs
  Chromium via Playwright). Config: `--emulated-form-factor=mobile`, throttling on
  (`mobileSlow4G`/`mobile3G` preset). NOT the `lighthouse` MCP — that is an agent tool for
  this session, not a product dependency.
- **Data:** new `perf_metrics` (or reuse `findings` with `source='perf'`, severity mapped
  from CWV score bands: <0.5 serious, <0.9 moderate, else minor). Store LCP/CLS/TBT/FCP/SI.
- **Honesty wall:** perf is a Verdict-tier measured fact. It gets a severity chip (like axe),
  never persona *opinion* styling. Label it "measured", cite the metric + threshold.
- **UI:** a compact CWV tile row on the audit detail (reuse `Meter`/`SeverityChip`), and in
  the replay it could annotate the first frame ("LCP 3.7s on 3G").
- **Cost/perf:** a Lighthouse run adds ~10-20s per audit. Make it opt-in per run (a "measure
  performance" toggle), not default, so it does not slow every scan or inflate spend.

### Why not this session
It is a self-contained lens with its own worker dep, schema, and UI. It does not depend on
Replay Theater and Replay does not depend on it. Ship it as its own tracer-bullet slice.

## 2. Magica persona avatars — HOLD (re-confirmed, do not build)

Re-confirming the 2026-07-28 decision (ledger + CONTEXT.md brand wall): **no synthetic human
avatars.** The product's credibility rests on "we are not a costume / not a disability
simulator" (anti-accessiBe, Ashlee-Boyer framing). Generating faces for personas cuts
directly against that wall and buys nothing an honest instrument needs. Personas are already
represented by the deterministic `Monogram` tile.

Magica's only real lane remains launch/distribution social assets, and only when a
distribution push is actually running (demand is still zero). Not wired. Not now.

## Priority

Both are demand-gated. Nothing here outranks Liz sending the 10 agency outreaches
(`docs/demand/agency-outreach.md`). The perf lens is the stronger of the two builds when a
build slot opens; magica stays parked.
