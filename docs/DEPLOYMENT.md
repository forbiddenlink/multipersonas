# Deployment

**Status: not deployed. The web app cannot be deployed to Vercel as it stands.**

## Why not

`web/src/app/api/audit/route.ts` calls `runMultiPersonaTest()`, which calls
`chromium.launch()` (`src/agent/engine.ts`, `src/agent/orchestrator.ts`). That
launches a real Chromium process inside the request handler. On Vercel:

- no Chromium binary ships in the runtime, and nothing in the build installs one
  (`playwright install` is not in `package.json` scripts or `.github/workflows/ci.yml`);
- a Playwright + Chromium bundle does not fit the serverless unzipped size limit;
- the route asks for a 120s budget, which exceeds default function limits;
- the route's `AbortController` (the 120s timeout) rejects the promise but does
  **not** kill the browser — the Chromium processes keep running to completion.

This is an unfinished build, not a design error. The plan
(`thoughts/shared/plans/2026-04-19-multipersonas-plan.md:934`) already specifies the
right shape: **Railway Docker workers → Browserbase at scale**, with a queue between
the Vercel-hosted app and the browser. That worker split was never built, so the
browser ended up in the serverless route.

## The intended architecture (Phase 1)

```
Vercel (Next.js)  ──enqueue──>  Queue  ──>  Railway Docker worker (Chromium + engine)
     │                                              │
     └──────────────── poll/subscribe ──────────────┘
```

The app should accept the audit, return a job id immediately, and let a persistent
worker run the browser. Everything under `src/` is already deploy-target agnostic;
only the route needs to stop calling the engine inline.

## Blockers before any public deploy

These are not polish. The audit endpoint takes a URL from a stranger, points a
browser at it, and lets an LLM that has read that stranger's page choose where to
go next. Public + anonymous is a hostile environment.

1. **Durable rate limiting.** The current limiter is an in-process `Map`
   (`route.ts`) — per-instance, lost on recycle, and keyed off a client-settable
   `X-Forwarded-For`. The real ceiling is `limit x instances`, resetting constantly.
   Enforcement must move to shared state (Redis/Upstash or a Supabase table) and
   should live at the queue once Phase 1 lands.
2. **Spend cap + kill switch.** One audit is 65 sequential model calls
   (20 + 30 + 15 steps). Without a global daily cap, an unauthenticated caller
   spends against the Anthropic key until the card declines.
3. **Network isolation for the browser.** `src/security/url-guard.ts` resolves and
   validates every navigation, and the engine re-checks each document request — but
   DNS rebinding (resolve here, Chromium resolves again on connect) cannot be fully
   closed in-process. The durable fix is running the worker with an egress firewall
   that denies link-local and RFC1918 by default. Browserbase gives this for free;
   a Railway container needs it configured deliberately.

## Local development

```bash
pnpm install
cp .env.example .env          # ANTHROPIC_API_KEY is required
pnpm exec playwright install chromium
pnpm dev -- <url>             # CLI
```

For the web app, copy `.env.example` to `web/.env.local` and `cd web && pnpm dev`.
