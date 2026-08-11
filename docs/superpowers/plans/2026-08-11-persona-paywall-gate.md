# Persona Paywall Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the hosted persona task-success audit behind `profiles.plan` (`pro`/`team`); free/anonymous callers get a 402 upgrade response before any spend, and keep the free axe surface (`/grade` + CLI).

**Architecture:** One pure entitlement function plus an RLS-scoped plan read (`web/src/lib/entitlements.ts`), enforced with a single check in `POST /api/audit` placed before rate-limit and spend reservation. UX consumers (audit form, settings, landing) branch on the plan/402. No worker, orchestrator, engine, or DB-schema changes — the `plan` column already exists.

**Tech Stack:** Next.js 16 (App Router, route handlers), Supabase (`@supabase/supabase-js`, server client via `@/lib/supabase/server`), Vitest, TypeScript.

## Global Constraints

- Free vs paid boundary: free/anon get axe only (`/grade`, CLI); `pro`/`team` unlock personas. Copied from spec.
- Plan-based access (not credits). The existing durable spend/rate caps prevent abuse within a plan.
- Fail closed: any error reading the plan resolves to `"free"`.
- Gate must run BEFORE `consumeRateLimit` and `reserveSpend` so a gated call consumes neither quota nor budget.
- No Stripe, no new endpoint, no schema migration in this slice.
- No em dashes in user-facing copy (house rule). Use hyphens or sentence breaks.
- Tests run from `web/`: `pnpm exec vitest run <file>`.

---

### Task 1: Entitlement module

**Files:**
- Create: `web/src/lib/entitlements.ts`
- Test: `web/src/__tests__/lib/entitlements.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient<Database>` from `@supabase/supabase-js` + `@/lib/supabase/types`.
- Produces:
  - `type Plan = "free" | "pro" | "team"`
  - `planAllowsPersonas(plan: string | null | undefined): boolean`
  - `getSessionPlan(supabase: SupabaseClient<Database>, userId: string | null): Promise<Plan>`

- [ ] **Step 1: Write the failing test**

```ts
// web/src/__tests__/lib/entitlements.test.ts
import { describe, it, expect } from "vitest";
import { planAllowsPersonas } from "@/lib/entitlements";

describe("planAllowsPersonas", () => {
  it("allows pro and team", () => {
    expect(planAllowsPersonas("pro")).toBe(true);
    expect(planAllowsPersonas("team")).toBe(true);
  });
  it("denies free, anon (null/undefined), and unknown plans", () => {
    expect(planAllowsPersonas("free")).toBe(false);
    expect(planAllowsPersonas(null)).toBe(false);
    expect(planAllowsPersonas(undefined)).toBe(false);
    expect(planAllowsPersonas("enterprise")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm exec vitest run src/__tests__/lib/entitlements.test.ts`
Expected: FAIL — cannot resolve `@/lib/entitlements`.

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/lib/entitlements.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type Plan = "free" | "pro" | "team";

/** Plans that unlock the persona task-success layer. */
export const PERSONA_PLANS: readonly Plan[] = ["pro", "team"];

/** True iff this plan may run the hosted persona audit. Unknown/null -> false (fail closed). */
export function planAllowsPersonas(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "team";
}

/**
 * Read the caller's plan from profiles via the RLS-scoped server client. Anonymous callers,
 * a missing row, or any read error resolve to "free" so the gate fails closed (a pro user
 * briefly seeing the paywall is safe; the inverse would leak the paid layer). Never uses the
 * service-role client.
 */
export async function getSessionPlan(
  supabase: SupabaseClient<Database>,
  userId: string | null,
): Promise<Plan> {
  if (!userId) return "free";
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (error || !data) return "free";
  return planAllowsPersonas(data.plan) ? (data.plan as Plan) : "free";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm exec vitest run src/__tests__/lib/entitlements.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/entitlements.ts web/src/__tests__/lib/entitlements.test.ts
git commit -m "feat(web): add plan entitlement helper for the persona gate"
```

---

### Task 2: Enforce the gate in the audit route

**Files:**
- Modify: `web/src/app/api/audit/route.ts` (add import; insert gate after the user is resolved, before `consumeRateLimit`)
- Test: `web/src/__tests__/api/audit-plan-gate.test.ts`

**Interfaces:**
- Consumes: `planAllowsPersonas`, `getSessionPlan` from Task 1.
- Produces: `POST /api/audit` returns `402 { error, upgrade: true, freeAlternative: "/grade" }` for non-persona plans.

- [ ] **Step 1: Write the failing source-guard test**

```ts
// web/src/__tests__/api/audit-plan-gate.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The persona audit must refuse free/anon callers BEFORE consuming a rate-limit slot or
 * reserving spend, so a gated request costs nothing. Source-level guard (mirrors
 * audit-no-private) so a regression fails the moment the ordering breaks.
 */
describe("audit route gates personas by plan before spend", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/audit/route.ts"),
    "utf-8",
  );

  it("checks planAllowsPersonas and returns a 402 upgrade", () => {
    expect(src).toMatch(/planAllowsPersonas/);
    expect(src).toMatch(/status:\s*402/);
    expect(src).toMatch(/upgrade:\s*true/);
  });

  it("gates before consumeRateLimit and reserveSpend", () => {
    const gate = src.indexOf("planAllowsPersonas");
    const rate = src.indexOf("consumeRateLimit(");
    const spend = src.indexOf("reserveSpend(");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(rate);
    expect(gate).toBeLessThan(spend);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm exec vitest run src/__tests__/api/audit-plan-gate.test.ts`
Expected: FAIL — `planAllowsPersonas` not found in the route.

- [ ] **Step 3: Add the import**

In `web/src/app/api/audit/route.ts`, add after the existing `createAdminClient` import:

```ts
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
```

- [ ] **Step 4: Insert the gate**

In `web/src/app/api/audit/route.ts`, immediately after the URL-guard block (after `parsedUrl` is assigned) and BEFORE the `const admin = createAdminClient();` / rate-limit section, insert:

```ts
  // Persona task-success is the paid layer. Free/anonymous callers are refused here,
  // before any rate-limit slot or spend reservation, and pointed at the free axe grade.
  // Fail closed: getSessionPlan resolves unknown/error to "free".
  const plan = await getSessionPlan(supabase, user?.id ?? null);
  if (!planAllowsPersonas(plan)) {
    return NextResponse.json(
      {
        error: "Task-success personas are a Pro feature. Run a free accessibility grade instead.",
        upgrade: true,
        freeAlternative: "/grade",
      },
      { status: 402 },
    );
  }
```

- [ ] **Step 5: Run the gate test + full web suite**

Run: `cd web && pnpm exec vitest run src/__tests__/api/audit-plan-gate.test.ts && pnpm test`
Expected: PASS (gate test green; no existing test regresses).

- [ ] **Step 6: Typecheck**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/api/audit/route.ts web/src/__tests__/api/audit-plan-gate.test.ts
git commit -m "feat(web): gate hosted persona audit behind pro/team plan"
```

---

### Task 3: Paywall UX (audit form + settings + landing label)

**Files:**
- Modify: `web/src/components/audit-form.tsx` (add `upgrade` state; branch 402 in `handleSubmit`; render an upgrade block)
- Modify: `web/src/app/(app)/settings/page.tsx` (Request Pro CTA for free plan)
- Modify: `web/src/app/page.tsx` (a small "Pro" label on the persona section — copy only)
- Test: `web/src/__tests__/paywall/audit-form-402.test.ts`

**Interfaces:**
- Consumes: the `402 { upgrade, freeAlternative }` contract from Task 2.
- Produces: user-visible upgrade path; no exported symbols.

- [ ] **Step 1: Write the failing source-guard test**

```ts
// web/src/__tests__/paywall/audit-form-402.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("audit form surfaces the paywall on 402", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/components/audit-form.tsx"),
    "utf-8",
  );
  it("branches on a 402 status distinctly from the generic error", () => {
    expect(src).toMatch(/res\.status === 402/);
  });
  it("points the user at the free grade", () => {
    expect(src).toMatch(/\/grade/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm exec vitest run src/__tests__/paywall/audit-form-402.test.ts`
Expected: FAIL — no `res.status === 402` branch yet.

- [ ] **Step 3: Add the upgrade state**

In `web/src/components/audit-form.tsx`, next to `const [error, setError] = useState<string | null>(null);` (around line 137) add:

```ts
  const [upgrade, setUpgrade] = useState(false);
```

- [ ] **Step 4: Branch the 402 in handleSubmit**

In `handleSubmit` (around line 305-309), immediately after `const data = await res.json();` and BEFORE the existing `if (!res.ok) { setError(...) }`, insert:

```ts
      if (res.status === 402) {
        setUpgrade(true);
        setLoading(false);
        return;
      }
```

Also reset it at the top of `handleSubmit` next to `setError(null);` (around line 288):

```ts
    setUpgrade(false);
```

- [ ] **Step 5: Render the upgrade block**

In the component's returned JSX, immediately after the `<form ...>...</form>` block (around line 362+), add:

```tsx
      {upgrade && (
        <div
          role="status"
          className="mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm"
        >
          <p className="font-medium">Task-success personas are a Pro feature.</p>
          <p className="mt-1 text-muted-foreground">
            Free accounts get the deterministic accessibility scan. Run a free grade on any
            public page, or ask about Pro to unlock persona task-success runs.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="/grade" className="underline underline-offset-4">Run a free grade</a>
            <a href="/settings" className="underline underline-offset-4">About Pro</a>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Settings Request-Pro CTA**

In `web/src/app/(app)/settings/page.tsx`, near where the current plan is shown (around line 62, `{profile?.plan ?? "free"}`), add below that block:

```tsx
          {(profile?.plan ?? "free") === "free" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pro is invite-only during early access. It unlocks persona task-success runs.{" "}
              <a
                href={process.env.NEXT_PUBLIC_SUPPORT_EMAIL
                  ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Pro%20access`
                  : "/waitlist"}
                className="underline underline-offset-4"
              >
                Request Pro access
              </a>
              .
            </p>
          )}
```

- [ ] **Step 7: Landing "Pro" label (copy only)**

In `web/src/app/page.tsx`, find the persona section heading (the RUN_LOG entry or the persona/task-success block) and add a small inline label so the boundary is honest, e.g. append to the persona heading text: `<span className="ml-2 rounded-sm border border-border px-1.5 py-0.5 text-xs text-muted-foreground">Pro</span>`. Place it on the persona/task-success sub-heading only, not the scan heading.

- [ ] **Step 8: Run the paywall test + full web suite + lint**

Run: `cd web && pnpm exec vitest run src/__tests__/paywall/audit-form-402.test.ts && pnpm test && pnpm exec eslint src/components/audit-form.tsx "src/app/(app)/settings/page.tsx" src/app/page.tsx`
Expected: PASS, no lint errors.

- [ ] **Step 9: Typecheck + build**

Run: `cd web && pnpm exec tsc --noEmit && pnpm build`
Expected: clean typecheck; successful build.

- [ ] **Step 10: Commit**

```bash
git add web/src/components/audit-form.tsx "web/src/app/(app)/settings/page.tsx" web/src/app/page.tsx web/src/__tests__/paywall/audit-form-402.test.ts
git commit -m "feat(web): paywall UX for the persona Pro gate"
```

---

### Task 4: Grant docs + env var

**Files:**
- Create: `docs/pro-access.md`
- Modify: `.env.example` (document `NEXT_PUBLIC_SUPPORT_EMAIL`)

**Interfaces:** none (documentation).

- [ ] **Step 1: Write the grant doc**

```markdown
<!-- docs/pro-access.md -->
# Granting Pro access (early access, no Stripe yet)

Persona task-success runs are gated behind `profiles.plan in ('pro','team')`. During early
access there is no self-serve checkout; grant access manually.

## Grant a user Pro

Find the user's id (by email):

```sql
select id, email from auth.users where email = 'person@example.com';
```

Set their plan:

```sql
update public.profiles set plan = 'pro' where id = '<user-uuid>';
```

`team` behaves the same as `pro` for the persona gate today.

## Contact routing

The "Request Pro access" link uses `NEXT_PUBLIC_SUPPORT_EMAIL` when set (a `mailto:`),
otherwise it falls back to the `/waitlist` page.

## When Stripe lands

A Stripe webhook will flip `profiles.plan` on subscription create/cancel. The gate
(`planAllowsPersonas`) does not change — only the source of the plan value does.
```

- [ ] **Step 2: Document the env var**

Add to `.env.example` under the web app section:

```bash
# Optional: support address for the "Request Pro access" link. Falls back to /waitlist if unset.
# NEXT_PUBLIC_SUPPORT_EMAIL=hello@yourdomain.com
```

- [ ] **Step 3: Commit**

```bash
git add docs/pro-access.md .env.example
git commit -m "docs: how to grant Pro access + support-email env var"
```

---

## Rollout note (do before promoting to prod)

The gate is active the instant it deploys (default `plan='free'`). Before `vercel --prod`:
1. Grant `pro` to any existing real users (Task 4 SQL) so nobody loses persona access unexpectedly.
2. Verify on a preview deploy: a free session hitting the audit form shows the paywall; a `pro` session runs personas.
3. This is an auth-boundary + monetization change — record checklist / evidence / owner in the PR before promoting (per the answerability contract).
