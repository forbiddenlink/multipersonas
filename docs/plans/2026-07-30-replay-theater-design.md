# Design: Persona Replay Theater (the signature "wow")

Written 2026-07-30. The build plan for the vision's signature feature. No em dashes.

## What it is

Every persona run becomes a scrubbable timeline: a screenshot per action, the goal it was
chasing, the persona's inner monologue for that step, and the axe evidence captured at that
exact state. A DVR for "did a real user succeed", deep-linkable to any moment, and cuttable
into a short shareable clip. This is the demo that makes people say "holy cow".

## Data model

Per run, per persona, an ordered list of steps:
- step index, action, detail, reasoning (the inner monologue), pageUrl, timestamp
- screenshot (stored in Supabase Storage, referenced by path, served via short-lived signed URL)
- axe findings captured at that state (already stored in `findings`, joinable by page_url)
- task-success outcome for the persona (already stored)

New: a `journey_steps` table (run_id, persona_id, step, action, detail, reasoning, page_url,
screenshot_path, ts) and a private Supabase Storage bucket `journeys`.

## Privacy, done properly (this is load-bearing, not an afterthought)

Screenshots of a site behind a login can contain a client's real data (names, orders, PII).
So:
- Default: capture + persist screenshots only for PUBLIC (unauthenticated) scans.
- Behind-login scans: screenshots are opt-in per project, stored in the private bucket,
  access scoped to the owner via RLS + signed URLs, and short retention (e.g. 30 days).
- Never surface a behind-login screenshot in a public sample or shareable clip.
This keeps the "credentials and client data stay protected" promise intact.

## Phases

- **P1 (done): engine captures per-step reasoning.** StepRecord.reasoning, committed.
- **P2 (code DONE, infra gated on Liz): persistence.** `web/supabase/migrations/014_journey_steps.sql`
  (journey_steps table + RLS scoped via test_runs.user_id + private `journeys` Storage bucket +
  owner-scoped read policy); worker (`worker/src/index.ts` `persistJourney`) uploads step
  screenshots + writes the journey, best-effort. types.ts + engine.d.ts shim updated. NEEDS Liz:
  apply migration 014 + it creates the bucket (Supabase writes are classifier-blocked). Runtime-
  unverified until applied (same gap as prior migrations).
- **P3 (DONE + visually verified): replay UI.** `web/src/components/replay-theater.tsx` — a
  scrubbable filmstrip on the audit detail page (frame + serif reasoning caption + the axe
  finding(s) at that state + inferred-frustration ribbon that doubles as the scrubber), play/
  scrub/step, keyboard, deep-link `?persona=&step=`, "⧉ link" copy-moment share. `web/src/lib/journey.ts`
  loads + signs. Verified dark + light + mobile + deep-link + evidence-at-state, axe-safe, 0
  console errors.
- **P4 (composition + renderer ready; hosted render gated): shareable clip.** Isolated `video/`
  Remotion project (OUTSIDE the pnpm workspace so its chromium/ffmpeg deps never touch the app):
  `JourneyClip` composition + `render.mjs` SSR script + sample-journey.json + README. Renders MP4/
  GIF locally. NOT installed/rendered here (heavy deps) and per-user in-app render needs Remotion
  Lambda or a render worker (Vercel/Next can't run renderMedia). Ships-now share = the deep-link
  "⧉ link" button.
- **P5:**
  - **Frustration ribbon (DONE):** `web/src/lib/frustration.ts` — a deterministic 0-100 per-step
    signal from backtracking / revisits / stalls / terminal relief-vs-rage. NOT a model call
    (free + honest). Unit-tested. Rendered as a calm-to-rage ribbon in the replay + the clip.
  - **lighthouse perf lens + magica:** scoped in `docs/plans/2026-07-30-replay-p5-perf-persona-and-magica.md`.
    Perf lens = BUILD as its own slice (deterministic 'perf' source, worker-run lighthouse, real CWV).
    magica avatars = HOLD (brand wall, no synthetic humans).

## Non-goals / guardrails
- Reasoning is navigation narration, never a compliance verdict (the axe/persona wall).
- No behind-login screenshots in public/shareable surfaces (privacy above).
- Screenshots are storage-heavy: cap resolution, prune old runs, signed URLs only.

## The gate
P2 needs Liz to (1) create the `journeys` Storage bucket and (2) apply the journey_steps
migration to prod. Once those exist, P3 (UI) and P4 (clip) are pure app work the agent can
build and verify.
