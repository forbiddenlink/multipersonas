# Design: Persona task-success as the paid tier (plan gate)

Written against: current `main` (post-046aa21), 2026-08-11.

## Problem & why

The persona **task-success verdict** (does a real-shaped user actually complete the flow?)
is multipersonas' one validated differentiator — axe-vs-crawler detection was disproven
(run 4), but task-success personas hold up. It is also the only model-cost surface. Today
the hosted persona audit (`POST /api/audit`) runs personas for **anyone** within rate/spend
caps, including anonymous and `free` users — so the differentiated, expensive layer is given
away and every free audit burns model spend.

The `profiles.plan` column (`free | pro | team`, default `free`) already exists
(`web/supabase/migrations/001_initial_schema.sql:7`) but is **enforced nowhere**. This slice
activates it: gate the persona layer behind `pro`/`team`; `free` and anonymous users keep the
deterministic axe surface they already have (the public `/grade` page and the keyless CLI —
both free, no model cost).

Decisions locked with the user: **gate first, Stripe later** (pre-users; grant `pro`
manually / via a request CTA); **free = axe scan, paid = personas**; **plan-based** access
(not credits — the durable spend caps already prevent abuse within a plan).

## Goal / success criteria

- A `free`/anonymous caller of `POST /api/audit` is refused **before** any rate-limit slot or
  model spend is consumed, and is pointed at the free axe alternative (`/grade`).
- A `pro`/`team` caller runs the persona audit exactly as today.
- The gate is one pure, unit-tested function; enforcement is one route check.
- The paywall moment is visible in the UI (audit form + settings), and there is a no-Stripe
  path to request and grant Pro.
- No worker/orchestrator/engine changes. All green (root + web tests, tsc, lint).

## Non-goals (explicit)

- No Stripe / checkout / webhook / subscription state machine (later slice, same gate).
- No free axe-only *multi-page hosted* audit mode (the CLI already covers free multi-page
  scanning; building a hosted axe-only crawl is deferred).
- No team seat management.

## Components

### 1. Entitlement — `web/src/lib/entitlements.ts` (new)

Single source of truth for the gate.

```ts
export type Plan = "free" | "pro" | "team";
export const PERSONA_PLANS: readonly Plan[] = ["pro", "team"];
export function planAllowsPersonas(plan: string | null | undefined): boolean;
export function getSessionPlan(supabase): Promise<Plan>; // RLS-scoped read of profiles.plan
```

- `planAllowsPersonas`: pure; `true` iff plan is `pro` or `team`. Defaults/unknown -> `false`.
- `getSessionPlan`: reads `profiles.plan` for the authenticated user via the RLS-scoped server
  client (`@/lib/supabase/server`). No user, no row, or error -> `"free"` (fail closed to the
  free tier). Never uses the admin/service client (no RLS bypass).

### 2. Enforcement — `web/src/app/api/audit/route.ts` (edit)

After resolving `user` (line ~26) and BEFORE the rate-limit consume and `reserveSpend`
(so a gated request burns neither the quota nor the budget):

```ts
const plan = user ? await getSessionPlan(supabase) : "free";
if (!planAllowsPersonas(plan)) {
  return NextResponse.json(
    { error: "Task-success personas are a Pro feature.", upgrade: true, freeAlternative: "/grade" },
    { status: 402 },
  );
}
```

Placement: after the URL guard (so a blocked URL still 400s first — cheapest rejection wins)
and before rate-limit. Anonymous callers short-circuit to `"free"` without a DB read.

### 3. Paywall UX

- `web/src/components/audit-form.tsx`: on a `402` response, render an upgrade state — copy
  "Task-success personas are a Pro feature", a primary link to `/grade` (free axe grade), and
  a secondary "Request Pro access" action. Do not treat 402 as a generic error.
- `web/src/app/(app)/settings/page.tsx`: show the current plan and, for `free`, a "Request Pro
  access" control.
- Landing (`web/src/app/page.tsx`) persona section: a small "Pro" label so the boundary is
  honest before signup. (Copy only; no logic.)

### 4. Request-and-grant (no Stripe)

Pro is invite-only during early access, so there is **no request endpoint** (avoids a new
route and avoids overloading the `waitlist` table, which has a `unique(email)` that would
collide with real signups):

- The paywall/settings "Request Pro access" control is a contact link: `mailto:` using
  `NEXT_PUBLIC_SUPPORT_EMAIL` when set, otherwise a link to the existing `/waitlist` page. No
  new DB write, no new endpoint.
- Grant is manual and documented: `update public.profiles set plan = 'pro' where id = '<uuid>';`
- Documented in `docs/pro-access.md`, including how to find a user's id.

## Data flow

`POST /api/audit` -> parse/validate URL (400 on bad) -> resolve session user -> `getSessionPlan`
-> `planAllowsPersonas`? no -> **402 upgrade** (no spend). yes -> existing path (rate-limit ->
reserveSpend -> enqueue). Worker path unchanged.

## Error handling

- Gate read failure (DB error in `getSessionPlan`) -> treat as `free` (fail closed; a `pro`
  user briefly seeing the paywall is safe and self-correcting; the inverse would leak the paid
  layer). Logged + Sentry-captured via the existing route capture.
- 402 is a distinct status the client branches on; all other failures keep current behavior.

## Testing

- `entitlements.test.ts`: `planAllowsPersonas` truth table (free/anon -> false; pro/team ->
  true; unknown/null -> false).
- Source-guard `audit-plan-gate.test.ts`: `api/audit/route.ts` calls `planAllowsPersonas`
  and returns 402 **before** `reserveSpend`/`consumeRateLimit` (assert ordering by index of
  the substrings, mirroring the repo's existing source-guard tests).
- Paywall copy test: audit-form handles a 402 branch (references `/grade` + "Pro").

## Rollout

Ship dark-safe: default `plan='free'` means the gate is immediately active on deploy; grant
`pro` to any existing real users first (`update profiles ...`) so nobody is surprised. Because
prod deploy is manual (`vercel --prod`), verify the gate on a preview deploy before promoting.
This is an auth-boundary + monetization change (validation zone): record the checklist/
evidence/owner in the PR before it ships.
