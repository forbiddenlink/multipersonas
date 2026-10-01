# Profile: Personaudit (multipersonas)

Snapshot of origin/main 67dcc45, 2026-10-01. Local production build on port 3460 with placeholder Supabase env.

## The product in one sentence
Personaudit runs axe-core at every state a signed-in crawl reaches (behind the login, with the session kept on the user's machine) and hands agencies and dev teams a client-ready accessibility report.

- Serves: web agencies and dev teams who owe a client accessibility evidence.
- Main action: grade a client's public site (free, no signup) at `/grade`, then move to the CLI or a paid plan.
- Honesty wall (DESIGN.md): axe-core findings are the only compliance output. Persona output is labeled AI opinion. No invented metrics.

## Approved direction already in place
`web/DESIGN.md`: "Evidence Dossier", locked 2026-09-26. Manila desk, near-white sheets, ink-blue, redline, highlighter, rubber stamp, Newsreader + IBM Plex Sans + Plex Mono. Per v2 rules this plan evolves it. It is replaced only if the reviewer scores point of view under 3.

## Routes and templates
Public (judged here, rendered locally without Supabase):
`/` · `/for-agencies` · `/pricing` · `/docs` · `/grade` · `/grade/[token]` (needs a stored grade) · `/sample-report` · 5 guides (`/guides/*`) · `/privacy` · `/terms` · `/accessibility` · `/auth/login` · `/auth/signup` · `/auth/forgot-password` · `/auth/update-password` · 404 · error boundaries.
Auth-gated app (needs a local Supabase stack, see progress.md): `/dashboard` · `/audits/[id]` · `/audits/[id]/report` · `/projects` · `/projects/[id]` · `/personas` · `/settings` · `/waitlist`.
Non-UI: `/api/*`, `sitemap.xml`, `manifest`, OG image routes (`opengraph-image`, `grade/[token]/opengraph-image`, `apple-icon`).

## Shared components
`site-header`, `site-footer`, `mobile-nav`, `theme-toggle`, `marketing-shell`, `app-nav`, `app-auth-shell`, `app-page-header`; dossier set (`evidence-sheet`, `state-flow-trail`, `sample-task-success`, `sample-cover-sheet`, `grade-verdict-stamp`, `grade-finding-row`, `content-article/prose/callout/code-block`); forensic set (`severity-chip` and friends); forms (`grade-form`, `audit-form`, `waitlist-form`); shadcn-style `ui/`.

## Tokens and fonts
OKLCH tokens in `web/src/app/globals.css` (desk, sheet, ink, ink-blue primary, redline, highlight, severity x4). Radius 3px. Newsreader (display), IBM Plex Sans (UI), IBM Plex Mono (evidence). Light-first with a "night desk" dark theme.

## Content types
Marketing copy, 5 evergreen guides, legal pages, a sample report built from `src/lib/sample-evidence.ts`, the probe ledger from `src/lib/probe-ledger.ts` (real experiment data in `experiments/`).

## User journeys
1. Visitor -> `/grade` (free grade) -> `/grade/[token]` result -> CLI docs or Solo checkout.
2. Visitor -> `/sample-report` -> trust -> `/pricing` or `/for-agencies`.
3. Dev -> `/docs` + `/guides/ci-accessibility-gate` -> install CLI.
4. Subscriber -> dashboard -> audit -> report export / print.

## Already distinctive and worth keeping
- Case-file metaphor carried by real primitives: `.sheet`, `.margin-rule`, `.file-tab`, `.stamp`, `.mark`, `.redline-note`.
- The hero evidence sheet with real SauceDemo findings.
- The state-flow trail (crawl map) and probe ledger including the row where nothing was found.
- No gradient blobs, no logo wall, no testimonials; the honesty wall is part of the brand.

## Weaknesses found in the baseline screenshots (design-research/screens/before)
- The metaphor is concentrated in the hero and the sheet components. Section eyebrows are plain mono labels, so mid-page and on guides/pricing/docs the "case file" thins out.
- The primary action (grade a URL) is a link to another page from the hero; the URL field sits 900px lower on the home page.
- The home page is ~6000px at 1280 and ~12000px at 390: 9 bands with similar rhythm.
- Motion is minimal and mostly unused; no considered moment of "evidence materializing".

## Unknowns (not invented)
- Real conversion rates and analytics: not available locally, not queried.
- Behaviour of auth-gated pages with real data: needs the local Supabase stack.
- Preview deployments lack Supabase env, so only local builds are judged.
