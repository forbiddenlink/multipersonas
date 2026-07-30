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
- **P2: persistence.** Migration for `journey_steps` + the `journeys` Storage bucket + RLS;
  worker uploads step screenshots and writes the journey. NEEDS Liz (prod infra): create
  the bucket and apply the migration (Supabase writes are classifier-blocked for the agent).
- **P3: replay UI.** A scrubbable filmstrip on the audit detail page: screenshot + reasoning
  caption + the axe finding(s) at that state, play/scrub/step, deep-link to a moment.
  Design language: forensic terminal. Use figma/canva MCP if a richer visual is wanted.
- **P4: shareable clip.** Render the journey (or just the stuck-moment) to an MP4/GIF with
  the `remotion` MCP (video in React): screenshots + captions + the frustration ribbon, 6
  seconds, Slack-able. Every share is an ad.
- **P5: enrichment + tool-powered personas.**
  - Frustration ribbon: a 0-100 signal per step (derive from backtracking/repeats or ask the
    model), colored calm-to-rage.
  - `magica` MCP: generate persona avatars + marketing visuals so the personas feel real.
  - `lighthouse` MCP: power a genuine "mobile on slow 3G" performance persona with real
    Core Web Vitals, not a simulated label.

## Non-goals / guardrails
- Reasoning is navigation narration, never a compliance verdict (the axe/persona wall).
- No behind-login screenshots in public/shareable surfaces (privacy above).
- Screenshots are storage-heavy: cap resolution, prune old runs, signed URLs only.

## The gate
P2 needs Liz to (1) create the `journeys` Storage bucket and (2) apply the journey_steps
migration to prod. Once those exist, P3 (UI) and P4 (clip) are pure app work the agent can
build and verify.
