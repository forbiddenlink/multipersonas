# Persona Replay Theater — shareable clip renderer

Renders a persona's journey into a ~6 second forensic-terminal clip (MP4 or GIF):
frames cross-fading, the persona's inner monologue captioned, axe evidence surfacing at
the state it was found, and a frustration ribbon rising to the outcome. Slack-able. Every
share is an ad.

This is Phase P4 of the Persona Replay Theater design (shipped; design doc removed in the docs cleanup, see git log for docs/plans/2026-07-30-replay-theater-design.md).

## Why it lives outside the workspace

This package is **deliberately excluded** from the pnpm workspace (`pnpm-workspace.yaml`
lists only `web` and `worker`). Remotion pulls a headless Chromium + ffmpeg — hundreds of
MB that must never land in the deployed web/worker lockfile. Install and run it on demand.

## Local render

```bash
cd video
npm install                 # downloads Chromium + ffmpeg the first time (heavy)
npm run render              # sample-journey.json -> out/journey-clip.mp4
npm run render:gif          # -> out/journey-clip.gif
npm run studio              # interactive Remotion Studio preview
node render.mjs path/to/journey.json --out out/my-clip.mp4
```

> Not yet rendered/verified in-repo — the deps are intentionally uninstalled. The first
> `npm install` + `npm run render` is the validation step. The composition mirrors the live
> `ReplayTheater` component and the same tokens, so it should read identically in motion.

## Feeding it a real audit

`sample-journey.json` documents the input shape (`JourneyClipProps` in `src/schema.ts`).
A real journey comes from the app's `loadJourney()` (`web/src/lib/journey.ts`), which
returns `PersonaJourney[]`. The field mapping is a straight rename per step:

| clip prop      | from `ReplayStep`                    |
| -------------- | ------------------------------------ |
| `action`       | `action`                             |
| `reasoning`    | `reasoning`                          |
| `screenshot`   | `screenshotUrl` (signed URL or data URI) |
| `frustration`  | `frustration`                        |
| `findings`     | `findingsByUrl[step.pageUrl]`        |

Plus top-level `url`, `personaName`, `goalCompleted` (from the run + persona).

**Privacy wall (load-bearing):** only PUBLIC-scan screenshots may go into a clip. Never
embed a behind-login frame in a shareable artifact (see the design doc). Worker scans are
unauthenticated today, so their frames are public; keep this gate when opt-in behind-login
capture lands.

## Productionizing on-demand, per-user clips

`renderMedia()` (the SSR path used here) **cannot run on Vercel / in Next.js** — Remotion's
bundler needs a real filesystem + Chromium. Options for in-app "generate my clip":

1. **Remotion Lambda** (`renderMediaOnLambda`) — the recommended path. A one-time Lambda
   deploy; the web app triggers a render and polls for the output URL.
2. **A dedicated render worker** — extend the existing Railway worker (it already runs
   Chromium via Playwright) to run `renderMedia` off a queue, upload the MP4 to Storage,
   and hand back a signed URL.

Both are demand-gated infra (Liz). The composition + this script are ready; only the
hosted trigger is missing. Until then, the in-app share is the deep-link "⧉ link" button on
the replay, which opens the timeline at the exact stuck moment.
