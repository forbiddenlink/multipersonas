# Persona Realism — Design Spec

Snapshot as of 2026-08-01. Written against `bf7ce34` (main). Destination doc — freeze it;
reality lives in code + the eventual TDD plan. Re-validate file:line refs if HEAD moved.

Source: 2 research threads (trait-modeling + real a11y persona frameworks) + a live code-map
of the persona system. Full agent reports in `.claude/cache/agents/research-agent/`.

## The crux (read first): realism WITHOUT faking disability

The obvious move — add screen-reader / deaf / dyslexic personas from the GOV.UK roster — **is
the trap this project already rejected.** The code deliberately retired disability-simulation
personas (`RETIRED_PERSONA_IDS`, prebuilt.ts:119-122); `keyboard-traversal` is a *mechanical*
harness, not an LLM pretending to be blind. An LLM cannot authentically simulate a blind user's
cognition, and claiming it can IS the killed positioning ("AI personas experience your site like
disabled people do").

The honest reconciliation, and the spine of this design:

- **Impose REAL browser conditions, don't role-play experiences.** GOV.UK's most stealable asset
  isn't the narratives — it's their *runtime configs* (alphagov.github.io/accessibility-personas):
  actual OS a11y settings + browser userscripts per persona. We do the code equivalent: a persona
  can be *actually* keyboard-only (pointer disabled), *actually* at 400% zoom, *actually* on a
  throttled connection, *actually* under `forced-colors`/`reduced-motion` — all real Playwright
  emulation. Then we measure **task-success under that real constraint**. That is testable, honest,
  and defensible. "Could the checkout be completed with the mouse disabled?" is a fact, not a
  simulation of disability.
- **Traits change ACTIONS via code, not vibes.** (Below.)
- Personas remain UX-opinion + task-success only — NEVER a compliance verdict (axe owns that wall).
  A constraint-based persona measures *reachability/completion under a condition*, and its opinion
  stays sandboxed exactly as today.

## What the code actually is (grounded)

- `Persona` (types.ts:27-54) has `techProficiency` (1-5) + `patienceLevel` (low/med/high) — but
  they are **flavor text only**. `generateSystemPrompt` (types.ts:175) interpolates them into the
  prompt; nothing in `engine.ts` reads them to change behavior. **Only `maxSteps` crosses from data
  into control flow** (engine.ts:498 loop bound).
- Give-up = explicit `finish` tool (engine.ts:306-317), `goalCompleted` only on `outcome:"achieved"`
  (engine.ts:638) — never inferred. `isStuck` (engine.ts:424-434) hardcodes `repeatThreshold=3`,
  persona-blind.
- Frustration (web/src/lib/frustration.ts) is deterministic but **uniform across personas** — a
  low-patience and high-patience persona on identical steps score identically. Realism gap.
- Roster = 9 generic archetypes (prebuilt.ts 3 + library.ts 6), constraint-tagged only by category.

## Design

### 1. Trait vector → code-enforced constraints (NOT prompt-only)
Research is blunt: prompt-only persona steering is **unreliable for reproducibility** (PersonaGym —
even Claude 3.5 / GPT-4.5 fail persona-consistency at scale; arxiv 2407.18416). Fix per
12-factor-agents Factor 8 (own your control flow): the LLM picks the action, **code enforces the
boundary the trait implies.**

Extend `Persona` (types.ts:27) with a numeric `traits` vector (0-1): `patience`, `techLiteracy`,
`persistence`, `riskAversion`, `attentionToDetail`. Compile it into engine control flow:

| Trait (low) | Code-enforced behavior (in engine.ts, not the prompt) |
|---|---|
| patience | `isStuck` threshold 3→2; give-up after fewer dead-ends |
| persistence | lower `maxSteps` derived floor; earlier `finish(blocked)` |
| techLiteracy | tool-schema gates: strip "infer icon meaning" — force visible-label-text targeting; jargon in page text is "misread" not understood |
| riskAversion (high) | inject a forced re-read/confirm step before irreversible actions (submit/pay) |
| attentionToDetail (low) | higher mis-click probability surfaced as a real action (below) |

Keep decision *boundaries* deterministic (CI reproducibility — the whole point of task-success being
trustworthy); keep wording / exploration order stochastic (realism). This is the split the research
explicitly recommends.

### 2. Constraint conditions = the honest "abilities" (real emulation)
Add a `conditions` block to `Persona` that the engine applies to the Playwright context BEFORE the
run — each is a real, measurable browser state, tagged with the **Microsoft Persona Spectrum**
(permanent / temporary / situational) as metadata, not a disability claim:

- `keyboardOnly` → disable pointer; navigation must succeed via keyboard (already the traversal harness — generalize it)
- `zoom` (e.g. 2.0-4.0) → real `deviceScaleFactor` / CSS zoom + reflow at 400% (WCAG 1.4.10 territory, but measured as "did it still work", not judged)
- `reducedMotion` / `forcedColors` → Playwright `emulateMedia`
- `throttle` (already have `connectionSpeed`) → real network throttle
- `smallViewport` / one-handed mobile → real viewport
Task-success is then "goal completed UNDER this condition" — a fact.

### 3. Fix the "banana problem" — give-up / misread as FIRST-CLASS actions
Named failure mode (arxiv 2605.12894): LLM user-sims inherit the base model's cooperative bias, so
they never truly quit → task-success looks artificially high → the metric lies. Fix: add real tools
`give_up(reason)`, `misread(element, expected, actual)`, `wrong_click(element)` alongside `finish`.
Low-patience/low-attention traits raise their probability via code gating. A persona that *should*
fail a broken flow now *does*. This directly hardens the one output that is the moat.

### 4. Persona-aware frustration
`frustration.ts` currently ignores the persona. Feed it `patience` + `persistence`: same steps,
low-patience persona climbs the frustration curve faster and hits "blocked" sooner. Keep it
deterministic (reproducible) — just parameterized by the trait vector instead of uniform constants.

### 5. Roster (constraint-tagged, honest)
Replace "9 generic archetypes" drift with ~7 personas each combining a trait vector + a real
condition, spectrum-tagged: keyboard-only + low-tech; 400%-zoom + low-vision-situational;
first-timer + low-tech + high-anxiety (cognitive load); motor-precision (large-target need, real
mis-click rate up); one-handed-mobile + throttled (situational); power-user (high tech, low patience
— the impatient-expert); non-native-reader (jargon → misread). Each maps to a DISTINCT
ability-to-complete-the-task, not decoration.

### 6. Evaluation — trait fidelity + refusal (matches the agent-intent-tests rule)
- **Trait fidelity:** adopt PersonaScore's "Expected Action" dimension — assert a low-patience
  persona gives up sooner than a high-patience one on the same broken fixture.
- **Refusal / intent test (mandatory half):** inject 1-2 out-of-spec probes per eval run (mislabeled
  field, dead link, unsolvable step); assert the persona logs `give_up`/blocked, NOT a fake success.
  This is the [[agent-intent-tests]] refusal test made concrete.

## Validity caveats (state these honestly, don't oversell)
Simulated-user ↔ real-human agreement is genuinely limited — "Lost in Simulation" (ACL 2026) found
up to 9-point divergence across populations. So: personas are a **directional UX signal + a
task-success probe under real constraints**, never a substitute for real user testing, and never a
compliance claim. This matches the existing product memory (personas validated for task-success at
n=2 only). Keep that honesty in the copy.

## Sequencing (this is roadmap track ②, moat depth)
Cheap, high-leverage, and it deepens the exact layer competitors can't copy. BUT per every strategy
note, **demand still leads** — the grader (just shipped) and outreach come first. Build this as a
focused slice after early demand signal, or in parallel if signal stalls. Do NOT out-build demand.

## Prior art to read (not a threat)
`github.com/loxpes/mimic` — same Observe→Decide→Act (persona config → LLM → Playwright), TS,
screenshot/DOM evidence. Generic UX-bug finding, no a11y task-success. Worth a code read for harness
patterns before implementing.

## Code hooks (where each lands)
- `src/personas/types.ts:27` — extend `Persona` with `traits` + `conditions`.
- `src/personas/types.ts:175` (`generateSystemPrompt`) — surface traits as text AND (new) emit the
  behavioral summary; but the enforcement is NOT here.
- `src/agent/engine.ts` — `isStuck` (424-434) trait-modulated threshold; new `give_up`/`misread`
  tools near the tool list (306-317); condition application at context creation (~470-478, beside
  the SSRF route guard); trait-derived give-up in the loop.
- `web/src/lib/frustration.ts` — accept a trait param; parameterize the constants.
- `src/personas/library.ts` / `prebuilt.ts` — the new constraint-tagged roster.
- New: `src/personas/traits.ts` (pure trait→boundary mapping, fully unit-testable — the TDD core,
  mirrors how `src/grader/score.ts` isolated the pure logic).

## Delivered vs deferred (as of 2026-08-02 — best safe state)

**Delivered + shipped + verified live** (commits 98c7160 → 8a38984, worker + web on prod):
- Trait vector + back-compat derivation (`traits.ts`).
- Code-enforced give-up in the engine loop — decision extracted to `nextGiveUpState`,
  deterministically unit-tested. Verified live: impatient persona blocked in 2 steps vs
  patient in 4 on a real prod audit.
- Real browser conditions (reduced-motion / forced-colors / color-scheme) via newContext —
  proven real via matchMedia. Margaret runs under forced-colors + reduced-motion.
- Persona-aware frustration in Replay Theater (`frustration.ts` scaled by patience).

**Deferred — deliberately, with rationale (NOT silently dropped):**
- **Fine-trait PROMPT integration.** DEFERRED: PersonaGym shows prompt-steering is
  unreliable/unreproducible; code-enforcement is the reliable lever and is done. Injecting
  trait text into the core system prompt shifts every run's verdict (the moat metric) for
  low marginal value. Revisit only behind a proper eval harness.
- **Real network throttle** (make `connectionSpeed` real via CDP). DEFERRED: introduces
  goto-timeout fragility — a slow-3g persona's page may not load inside the 30s timeout,
  turning an honest "slow" into a false "failed". Needs a per-persona timeout bump + load
  test first. Honest to want; not a clean win yet.
- **Real keyboard-only enforcement** (make `inputModality: keyboard` real). DEFERRED:
  Playwright cannot disable the mouse; real enforcement means redesigning the agent's
  action space (Tab/Enter nav, reject pointer clicks) — a substantial change with
  regression risk on the core loop.
- ~~**New ability-based roster personas.**~~ DELIVERED 2026-08-16: three situational-
  constraint personas (keyboard-office-worker, one-handed-mobile, gloved-outdoor-courier),
  spectrum-tagged per Microsoft's Persona Spectrum, using only already-real primitives
  (traits, inputModality, viewport/connection — no fabricated zoom/throttle). The
  engine↔web display-meta sync gap is closed by a new test
  (`web/src/__tests__/lib/personas-engine-sync.test.ts`) that fails if the two ever drift.
- **Refusal intent-tests with a live model.** DEFERRED: needs adversarial/out-of-spec
  fixtures + non-deterministic model runs. The give-up *decision* is now deterministically
  tested (`nextGiveUpState`); the full-loop refusal behavior against broken fixtures is the
  remaining piece.

## Considered & rejected
- GOV.UK disability personas as SIMULATED users — REJECTED (brand wall; can't authentically simulate
  disability; it's the killed positioning). We steal their runtime-config idea, not the role-play.
- Prompt-only trait steering — REJECTED (research: unreliable/unreproducible; enforce in code).
- Synthetic faces/voices/avatars — REJECTED (no synthetic humans).
- Suppressing give-up to boost task-success numbers — REJECTED (the banana problem; it makes the
  metric lie).
