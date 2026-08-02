# Public Accessibility Grader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a free, ungated, public-page accessibility "grader" — enter a URL, get an honest letter-graded axe score with a shareable result page — as a top-of-funnel demand wedge for the behind-login product.

**Architecture:** A pure scoring module in the engine (`src/grader/`) computes an honest grade from axe violation-weight vs passed-check-weight. A dedicated grader scan BFS-crawls public pages only (reusing the existing SSRF url-guard) and runs axe capturing both passes and violations. The web app enqueues an anonymous `kind='grade'` job onto the existing `audit_jobs` queue (no model spend — axe is keyless); the Railway worker runs it and writes results to a new public-readable `grader_scans` table keyed by a random share token. A public `/grade/[token]` page renders the score + a dynamic OG image so shares preview in Slack/Twitter. Honest UX: the result explicitly says it only saw public pages and CTAs to the behind-login waitlist — never a paywall on the score.

**Tech Stack:** TypeScript, Playwright + @axe-core/playwright (already in engine deps), Next.js 16 / React 19 (web), Supabase Postgres + RLS, `@vercel/og` for the OG image, Railway worker.

## Global Constraints

- **Honesty wall (hard):** axe = the deterministic verdict. This grader is axe-only — NO personas, NO LLM, NO model spend. Never present the grade as legal/WCAG compliance. Copy verbatim on every result: "Scanned N public pages only. It does not see behind login, PDFs, or real user flows."
- **No fabricated precision:** the grade must derive from real axe pass/fail weights, shown beside a traceable per-impact + per-WCAG-level table. Do NOT reintroduce a 0-100 composite pulled from nothing (a prior one always scored 0 and was removed).
- **SSRF:** the grader points a browser at stranger-supplied URLs. Every URL (entry + every crawled hop) must pass `assertUrlAllowed` / `isUrlAllowed` (`src/security/url-guard.ts`). `allowPrivate` must NEVER be set on this path.
- **Public pages only:** the grader never uses a `sessionFile`. It audits whatever is public.
- **Anonymous + abuse-bounded:** anonymous by IP. Reuse `consumeRateLimit`. Add a per-scan page cap (10) and a global concurrent-grade cap. Respect the `killSwitchEnabled()` freeze.
- **Node version:** engine + web target Node >=20 / CI Node 22. **No new dependencies** — the engine already ships axe/playwright; the OG image uses Next 16's built-in `next/og`.
- **Shared queue risk:** grader jobs ride the SAME `audit_jobs` queue + single worker as real audits. A grade flood could starve paying audits. Mitigations in this plan: `grade` rate-limit tier + a queued-grade-count backpressure cap in the enqueue route. A dedicated worker/queue or claim-priority for `kind='audit'` is a deferred follow-up (YAGNI at current volume — one worker, IP-limited).
- **Verification gate every task:** engine `pnpm test` + `pnpm exec tsc --noEmit`; web `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build`. All green before commit.

## File Structure

- `src/grader/score.ts` (NEW) — pure scoring: weights, page/site ratio, letter grade, WCAG-level rollup. No I/O. The TDD centerpiece.
- `src/grader/score.test.ts` (NEW) — unit tests for scoring.
- `src/grader/scan.ts` (NEW) — `gradeScan(entryUrl, opts)`: BFS public pages (reuse url-guard), run axe capturing violations + passes per page, return per-page weighted data + the computed grade. Isolated from `src/crawler/crawl.ts` so the honesty-walled product spine is untouched.
- `src/grader/scan.test.ts` (NEW) — a keyless source-guard test (no ANTHROPIC key needed) + a stubbed-page unit test.
- `package.json` (engine root, MODIFY) — add `"./grader": "./dist/grader/scan.js"` to `exports` so the worker can `import { gradeScan } from "multipersonas/grader"`. Engine tsc has `declaration: true`, so `dist/grader/scan.d.ts` is emitted and the worker gets full types with NO hand-written shim.
- `web/src/lib/limits.ts` (MODIFY) — add a `grade` rate-limit tier. The `anonymous` tier is **1/hour** (an audit-abuse guard); reusing it would strangle the grader funnel (visitors try 2-3 URLs at once).
- `web/supabase/migrations/015_grader.sql` (NEW) — `audit_jobs.kind` (default `'audit'`); `grader_scans` public-read table. (`user_id` is already nullable; `persona_ids`/`reserved_calls`/`status` all have defaults, so grade inserts need none of them.)
- `web/src/lib/database.types.ts` (MODIFY) — regenerate/hand-add `grader_scans` + `audit_jobs.kind`.
- `worker/src/index.ts` (MODIFY) — add `kind: string` to the `AuditJob` interface; import `gradeScan` from `multipersonas/grader`; branch claimed jobs on `kind`: `grade` → `gradeScan` → update `grader_scans` AND mark the `audit_jobs` row done (so the reaper leaves it).
- `web/src/lib/grade.ts` (NEW) — server helper: read a `grader_scans` row by token (public), shape it for the page.
- `web/src/app/api/grade/route.ts` (NEW) — POST: killSwitch → IP rate-limit (`grade` tier) → validate URL → queue-depth backpressure → enqueue `kind='grade'` → return `{ token }`.
- `web/src/app/api/grade/[token]/route.ts` (NEW) — GET poll: status + result by token.
- `web/src/app/grade/[token]/page.tsx` (NEW) — public result page (score, honest wall, table, waitlist CTA).
- `web/src/app/grade/[token]/opengraph-image.tsx` (NEW) — dynamic OG image via `next/og` (built into Next 16 — verified `next/og` resolvable; NO `@vercel/og` dependency).
- `web/src/app/grade/page.tsx` (NEW) — public entry: URL form → POST → poll → redirect to `/grade/[token]`.
- `web/src/components/grade-form.tsx` (NEW) — client form + polling.

---

### Task 1: Pure scoring module (`src/grader/score.ts`)

**Files:**
- Create: `src/grader/score.ts`
- Test: `src/grader/score.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  ```ts
  export type Impact = "critical" | "serious" | "moderate" | "minor";
  export const IMPACT_WEIGHT: Record<Impact, number>; // critical 4, serious 2, moderate 1, minor 0.5
  export interface PageAxe {
    url: string;
    violationsByImpact: Record<Impact, number>; // counts of violation nodes per impact
    passCount: number;                            // number of passed axe checks on the page
    wcagAAViolations: number;                     // violation count tagged wcag2a/wcag2aa
  }
  export interface GradeReport {
    grade: "A" | "B" | "C" | "D" | "F";
    score: number;              // 0-100, = 100 * passWeight / (passWeight + violationWeight), rounded
    pagesScanned: number;
    totalViolations: number;
    byImpact: Record<Impact, number>;
    wcagAAViolations: number;
    perPage: { url: string; score: number; violations: number }[];
  }
  export function computeGrade(pages: PageAxe[]): GradeReport;
  ```
- Grade bands (document in code): A ≥ 95, B ≥ 85, C ≥ 70, D ≥ 50, F < 50. Weight per passed check = 1. Site score = mean of per-page scores (equal weight per page — not gameable by page count). Empty input (0 pages) → grade "F", score 0, and the caller must treat "0 pages scanned" as an error state, not an F (handled in scan/route, not here).

- [ ] **Step 1: Write the failing tests**

```ts
// src/grader/score.test.ts
import { describe, it, expect } from "vitest";
import { computeGrade, IMPACT_WEIGHT, type PageAxe } from "./score.js";

const emptyImpacts = { critical: 0, serious: 0, moderate: 0, minor: 0 };

describe("computeGrade", () => {
  it("gives a clean page an A (all passes, no violations)", () => {
    const pages: PageAxe[] = [
      { url: "https://x.test/", violationsByImpact: { ...emptyImpacts }, passCount: 40, wcagAAViolations: 0 },
    ];
    const r = computeGrade(pages);
    expect(r.grade).toBe("A");
    expect(r.score).toBe(100);
    expect(r.totalViolations).toBe(0);
  });

  it("weights criticals 8x heavier than minors", () => {
    // 1 critical (weight 4) vs same passCount → lower score than 1 minor (weight 0.5)
    const withCritical = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, critical: 1 }, passCount: 10, wcagAAViolations: 1 },
    ]);
    const withMinor = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, minor: 1 }, passCount: 10, wcagAAViolations: 0 },
    ]);
    expect(withCritical.score).toBeLessThan(withMinor.score);
    expect(IMPACT_WEIGHT.critical / IMPACT_WEIGHT.minor).toBe(8);
  });

  it("score is passWeight/(passWeight+violationWeight)*100", () => {
    // passCount 10 (weight 10), 1 serious (weight 2) → 10/12 = 83.33 → 83
    const r = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts, serious: 1 }, passCount: 10, wcagAAViolations: 1 },
    ]);
    expect(r.score).toBe(83);
    expect(r.grade).toBe("C"); // 83 is in [70,85)
  });

  it("site score is the mean of per-page scores, not violation-count weighted", () => {
    const r = computeGrade([
      { url: "a", violationsByImpact: { ...emptyImpacts }, passCount: 10, wcagAAViolations: 0 },   // 100
      { url: "b", violationsByImpact: { ...emptyImpacts, critical: 10 }, passCount: 10, wcagAAViolations: 10 }, // 10/(10+40)=20
    ]);
    expect(r.score).toBe(60); // (100+20)/2
    expect(r.pagesScanned).toBe(2);
  });

  it("empty input returns F/0 without throwing", () => {
    const r = computeGrade([]);
    expect(r.grade).toBe("F");
    expect(r.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/grader/score.test.ts`
Expected: FAIL — "Cannot find module './score.js'".

- [ ] **Step 3: Implement `src/grader/score.ts`**

```ts
export type Impact = "critical" | "serious" | "moderate" | "minor";

export const IMPACT_WEIGHT: Record<Impact, number> = {
  critical: 4,
  serious: 2,
  moderate: 1,
  minor: 0.5,
};

export interface PageAxe {
  url: string;
  violationsByImpact: Record<Impact, number>;
  passCount: number;
  wcagAAViolations: number;
}

export interface GradeReport {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number;
  pagesScanned: number;
  totalViolations: number;
  byImpact: Record<Impact, number>;
  wcagAAViolations: number;
  perPage: { url: string; score: number; violations: number }[];
}

const IMPACTS: Impact[] = ["critical", "serious", "moderate", "minor"];

function bandFor(score: number): GradeReport["grade"] {
  if (score >= 95) return "A";
  if (score >= 85) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function pageScore(p: PageAxe): number {
  const violationWeight = IMPACTS.reduce(
    (sum, i) => sum + p.violationsByImpact[i] * IMPACT_WEIGHT[i],
    0,
  );
  const passWeight = p.passCount; // each passed check weighs 1
  const denom = passWeight + violationWeight;
  if (denom === 0) return 100; // nothing testable on the page → neutral
  return Math.round((100 * passWeight) / denom);
}

export function computeGrade(pages: PageAxe[]): GradeReport {
  if (pages.length === 0) {
    return {
      grade: "F", score: 0, pagesScanned: 0, totalViolations: 0,
      byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      wcagAAViolations: 0, perPage: [],
    };
  }
  const perPage = pages.map((p) => ({
    url: p.url,
    score: pageScore(p),
    violations: IMPACTS.reduce((s, i) => s + p.violationsByImpact[i], 0),
  }));
  const score = Math.round(perPage.reduce((s, p) => s + p.score, 0) / perPage.length);
  const byImpact = IMPACTS.reduce(
    (acc, i) => ({ ...acc, [i]: pages.reduce((s, p) => s + p.violationsByImpact[i], 0) }),
    {} as Record<Impact, number>,
  );
  return {
    grade: bandFor(score),
    score,
    pagesScanned: pages.length,
    totalViolations: perPage.reduce((s, p) => s + p.violations, 0),
    byImpact,
    wcagAAViolations: pages.reduce((s, p) => s + p.wcagAAViolations, 0),
    perPage,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/grader/score.test.ts`
Expected: PASS (5 tests). Then `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/grader/score.ts src/grader/score.test.ts
git commit -m "feat(grader): pure honest axe scoring (Deque weights, per-page mean)"
```

---

### Task 2: Grader scan (`src/grader/scan.ts`)

**Files:**
- Create: `src/grader/scan.ts`
- Test: `src/grader/scan.test.ts`

**Interfaces:**
- Consumes: `computeGrade`, `PageAxe` from `./score.js`; `assertUrlAllowed`, `isUrlAllowed` from `../security/url-guard.js`.
- Produces:
  ```ts
  export interface GradeScanOptions { maxPages?: number; onPage?: (url: string, i: number) => void; }
  export interface GradeScanResult { entryUrl: string; report: GradeReport; pagesVisited: string[]; skipped: string[]; }
  export async function gradeScan(entryUrl: string, opts?: GradeScanOptions): Promise<GradeScanResult>;
  ```
- Notes for implementer: this mirrors `src/crawler/crawl.ts`'s BFS (read it for the pattern) but (a) caps `maxPages` default at **10** (grader is a teaser, not a full audit), (b) NEVER accepts a `sessionFile` or `allowPrivate`, (c) per page collects BOTH axe `violations` and `passes` (the product `runAxeScan` returns violations only — the grader needs passes for the denominator, so call axe directly here). Use `@axe-core/playwright`'s `AxeBuilder`. Map each violation's `impact` to the `Impact` counts (nodes per violation counted individually); `passCount` = `results.passes.length`; `wcagAAViolations` = count of violations whose `tags` include `wcag2a` or `wcag2aa`.

- [ ] **Step 1: Write the failing test (keyless source-guard + pure mapping)**

```ts
// src/grader/scan.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// The grader must never require a model key and must never enable allowPrivate.
describe("grader scan source guards", () => {
  const src = readFileSync(new URL("./scan.ts", import.meta.url), "utf8");
  it("never imports the anthropic/model layer", () => {
    expect(src).not.toMatch(/@ai-sdk\/anthropic|generateText|ANTHROPIC/);
  });
  it("never sets allowPrivate to true", () => {
    expect(src).not.toMatch(/allowPrivate:\s*true/);
  });
  it("never loads a session/storageState (public pages only)", () => {
    expect(src).not.toMatch(/storageState|sessionFile/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/grader/scan.test.ts`
Expected: FAIL — cannot read `./scan.ts` (file missing).

- [ ] **Step 3: Implement `src/grader/scan.ts`**

```ts
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { assertUrlAllowed, isUrlAllowed } from "../security/url-guard.js";
import { computeGrade, type PageAxe, type Impact, type GradeReport } from "./score.js";

export interface GradeScanOptions {
  maxPages?: number;
  onPage?: (url: string, i: number) => void;
}
export interface GradeScanResult {
  entryUrl: string;
  report: GradeReport;
  pagesVisited: string[];
  skipped: string[];
}

const AA_TAGS = new Set(["wcag2a", "wcag2aa"]);

function emptyImpacts(): Record<Impact, number> {
  return { critical: 0, serious: 0, moderate: 0, minor: 0 };
}

export async function gradeScan(
  entryUrl: string,
  opts: GradeScanOptions = {},
): Promise<GradeScanResult> {
  const { maxPages = 10, onPage } = opts;

  const entry = await assertUrlAllowed(entryUrl); // no allowPrivate — public only
  const origin = entry.origin;

  const browser = await chromium.launch({ headless: true });
  const pages: PageAxe[] = [];
  const visited: string[] = [];
  const seen = new Set<string>([entry.href]);
  const queue: string[] = [entry.href];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    while (queue.length > 0 && visited.length < maxPages) {
      const url = queue.shift()!;
      if (!(await isUrlAllowed(url))) continue;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(1500);
      } catch {
        continue;
      }

      const results = await new AxeBuilder({ page }).analyze();
      const byImpact = emptyImpacts();
      let aa = 0;
      for (const v of results.violations) {
        const impact = (v.impact ?? "minor") as Impact;
        const key: Impact = ["critical", "serious", "moderate", "minor"].includes(impact) ? impact : "minor";
        byImpact[key] += v.nodes.length;
        if (v.tags?.some((t) => AA_TAGS.has(t))) aa += v.nodes.length;
      }
      pages.push({
        url: page.url(),
        violationsByImpact: byImpact,
        passCount: results.passes.length,
        wcagAAViolations: aa,
      });
      onPage?.(page.url(), visited.length);
      visited.push(page.url());

      // Enqueue same-origin links (public crawl).
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
      for (const href of hrefs) {
        try {
          const u = new URL(href);
          if (u.origin === origin && !seen.has(u.href)) {
            seen.add(u.href);
            queue.push(u.href);
          }
        } catch { /* ignore unparseable */ }
      }
    }
  } finally {
    await browser.close();
  }

  return { entryUrl: entry.href, report: computeGrade(pages), pagesVisited: visited, skipped: queue };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/grader/scan.test.ts` → PASS (3). Then `pnpm exec tsc --noEmit` clean, and full `pnpm test` green.

- [ ] **Step 5: Export `gradeScan` from the engine package**

The worker imports the engine as the `multipersonas` package via an explicit `exports`
map — add a subpath so `import { gradeScan } from "multipersonas/grader"` resolves. In the
ROOT `package.json` `exports` block (which already lists `./orchestrator`, `./engine`, …),
add:
```json
"./grader": "./dist/grader/scan.js"
```
Then rebuild so `dist/grader/scan.{js,d.ts}` exist (engine tsconfig has `declaration: true`,
so types ship automatically — no worker shim):
Run: `pnpm build` (root). Expected: `dist/grader/scan.d.ts` present.

- [ ] **Step 6: Commit**

```bash
git add src/grader/scan.ts src/grader/scan.test.ts package.json
git commit -m "feat(grader): public-only axe scan (passes+violations) + engine export"
```

---

### Task 3: Migration — grade job kind + public results table

**Files:**
- Create: `web/supabase/migrations/015_grader.sql`
- Modify: `web/src/lib/database.types.ts` (hand-add rows to match; regenerate after apply)

**Interfaces:**
- Produces DB objects later tasks use: `audit_jobs.kind text not null default 'audit'`, `audit_jobs.user_id` nullable; table `grader_scans(token uuid pk default gen_random_uuid(), job_id uuid, entry_url text, status text, report jsonb, pages_visited text[], error text, created_at timestamptz)` with a PUBLIC select policy (anonymous share links) and NO public insert/update (worker writes via service role, bypassing RLS).

- [ ] **Step 1: Write the migration**

```sql
-- web/supabase/migrations/015_grader.sql
-- Public accessibility grader: an anonymous, axe-only teaser scan. Reuses the
-- audit_jobs queue (worker claim/reaper/timeout machinery) via a `kind`
-- discriminator, and writes results to a PUBLIC-READABLE table keyed by an
-- unguessable token (shareable result links, no auth).

alter table public.audit_jobs
  add column if not exists kind text not null default 'audit';

-- Anonymous grader jobs have no owning user.
alter table public.audit_jobs
  alter column user_id drop not null;

create table if not exists public.grader_scans (
  token uuid primary key default gen_random_uuid(),
  job_id uuid references public.audit_jobs(id) on delete set null,
  entry_url text not null,
  status text not null default 'queued', -- queued | running | completed | failed
  report jsonb,
  pages_visited text[] not null default '{}',
  error text,
  created_at timestamptz not null default now()
);

alter table public.grader_scans enable row level security;

-- Public read: results are shared by unguessable token; anyone with the link sees it.
drop policy if exists grader_scans_public_read on public.grader_scans;
create policy grader_scans_public_read
  on public.grader_scans for select
  using (true);

-- No insert/update/delete policy: only the service role (worker + enqueue route)
-- writes, and service role bypasses RLS. anon/authenticated cannot write.
```

- [ ] **Step 2: Apply + verify (VALIDATION ZONE — Liz applies in Supabase SQL editor)**

This is a prod schema change. Do NOT auto-apply. Hand off: Liz runs `015_grader.sql` in the Supabase SQL editor. Verify via read: `audit_jobs.kind` exists, `user_id` nullable, `grader_scans` exists with `rls_enabled=true`, and `get_advisors(type='security')` shows no NEW advisory beyond the pre-existing intentional service-role INFOs.

- [ ] **Step 3: Update `database.types.ts`**

Regenerate types (or hand-add the `grader_scans` Row/Insert/Update + `audit_jobs.kind`) so web tsc sees the new table. Run `pnpm exec tsc --noEmit` in web.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/015_grader.sql web/src/lib/database.types.ts
git commit -m "feat(grader): migration for grade job kind + public grader_scans table"
```

---

### Task 4: Worker grade branch

**Files:**
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: `gradeScan` from `multipersonas/grader` (Task 2 export — fully typed, no shim); the existing `claim_audit_job` RPC result (`claimed`, now carrying `kind`).
- Produces: on `kind==='grade'`, writes `grader_scans` (running→completed/failed + report + pages_visited) AND marks the `audit_jobs` row completed/failed (line ~318's mechanism) so the reaper doesn't reap it.
- Verified against real code: worker imports the engine as the `multipersonas` package (`import { runMultiPersonaTest } from "multipersonas/orchestrator"`, `index.ts:6`); it claims via `supabase.rpc("claim_audit_job")` (`index.ts:280`) and on success updates `audit_jobs` `status:"completed"`/`"failed"` itself (`index.ts:318,325`) then `releaseReservation` on failure (`index.ts:329`; a no-op when `reserved_calls` is 0, which grade jobs are).

- [ ] **Step 1: Add `kind` to the `AuditJob` interface + import gradeScan**

At `worker/src/index.ts:6` add the import:
```ts
import { gradeScan } from "multipersonas/grader";
```
In the `AuditJob` interface (`index.ts` ~line 44-52), add:
```ts
  kind: string;
```
(The interface already has `id`, `user_id`, `url`, `persona_ids`, `status`, `project_id`, `reserved_calls` — `kind` joins them; `claim_audit_job` returns the whole row so it's populated.)

- [ ] **Step 2: Branch on kind right after the claim**

After `const { data: job } = await supabase.rpc("claim_audit_job")` resolves to a claimed
job (call it `claimed`), and BEFORE the `runMultiPersonaTest` path, insert:
```ts
if (claimed.kind === "grade") {
  await supabase.from("grader_scans").update({ status: "running" }).eq("job_id", claimed.id);
  try {
    const { report, pagesVisited } = await gradeScan(claimed.url, { maxPages: 10 });
    await supabase.from("grader_scans")
      .update({ status: "completed", report, pages_visited: pagesVisited })
      .eq("job_id", claimed.id);
    await supabase.from("audit_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    console.log(`[worker] graded ${claimed.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("grader_scans")
      .update({ status: "failed", error: message })
      .eq("job_id", claimed.id);
    await supabase.from("audit_jobs")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    console.error(`[worker] grade failed ${claimed.id}: ${message}`);
  }
  continue; // next poll — skip the persona path entirely (no spend reserve/release)
}
```
(Match the exact variable name the code uses for the claimed row and the surrounding
loop's `continue` target — read `index.ts:280-329` and slot this in above the persona
processing.)

- [ ] **Step 3: Verify worker compiles**

Run (in `worker/`): `pnpm typecheck`. Expected: clean (types for `gradeScan` come from
`dist/grader/scan.d.ts` via the package export — rebuild the engine first if needed).

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(grader): worker runs kind=grade jobs via gradeScan -> grader_scans"
```

---

### Task 5: Enqueue route `POST /api/grade`

**Files:**
- Modify: `web/src/lib/limits.ts` (add a `grade` rate-limit tier)
- Create: `web/src/app/api/grade/route.ts`

**Interfaces:**
- Consumes: `killSwitchEnabled` (`@/lib/limits`), `consumeRateLimit` (`@/lib/rate-limit`), `assertUrlAllowed` + `BlockedUrlError` (`@engine/security/url-guard`), `createAdminClient` (`@/lib/supabase/admin`).
- Produces: JSON `{ token }` (202) that Task 7 polls. Inserts one `audit_jobs` row (`kind='grade'`, `user_id=null`, `url`) and one `grader_scans` row (`job_id`, `entry_url`) via the admin (service-role) client. NO `reserveSpend` (axe is keyless — free).
- Verified: `consumeRateLimit(key, type)` → `{ allowed, retryAfterSeconds }` and degrades to ALLOW when the service key is unset (dev). `createAdminClient()` is synchronous, returns `SupabaseClient | null`. `audit_jobs` defaults cover `persona_ids` (`'{}'`), `reserved_calls` (`0`), `status` (`'queued'`) — the grade insert omits all three. `RateLimitType` is `keyof typeof RATE_LIMITS`, so a `grade` tier must be ADDED (the existing `anonymous` tier is 1/hour — wrong for a public grader).

- [ ] **Step 1: Add a `grade` rate-limit tier**

In `web/src/lib/limits.ts`, extend `RATE_LIMITS` (this is what makes `type: "grade"` valid):
```ts
export const RATE_LIMITS = {
  authenticated: { max: 5, windowSeconds: 10 * 60 },
  anonymous: { max: 1, windowSeconds: 60 * 60 },
  grade: { max: 5, windowSeconds: 10 * 60 }, // public grader teaser: generous but bounded
} as const;
```
There's a `limits.test.ts` covering these — add a one-line assertion that `RATE_LIMITS.grade.max === 5` so the tier is pinned. Run: `pnpm test` (web) green.

- [ ] **Step 2: Implement the route (with queue backpressure)**

```ts
import { NextResponse } from "next/server";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { killSwitchEnabled } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";

const MAX_QUEUED_GRADES = Number(process.env.GRADE_QUEUE_CAP ?? 25);

function getClientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  if (killSwitchEnabled()) {
    return NextResponse.json({ error: "Grading is temporarily unavailable." },
      { status: 503, headers: { "Retry-After": "3600" } });
  }
  const ip = getClientIP(request);
  const rate = await consumeRateLimit(`grade:${ip}`, "grade");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Free grade limit reached. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  let body: { url?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Please enter a URL to grade" }, { status: 400 });
  }
  try { await assertUrlAllowed(url); }
  catch (error) {
    if (error instanceof BlockedUrlError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Grading is not configured." }, { status: 503 });
  }

  // Backpressure: don't let a grade flood starve real audits on the shared worker.
  const { count } = await admin
    .from("audit_jobs")
    .select("id", { count: "exact", head: true })
    .eq("kind", "grade").eq("status", "queued");
  if ((count ?? 0) >= MAX_QUEUED_GRADES) {
    return NextResponse.json({ error: "The grader is busy. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } });
  }

  const { data: job, error: jobErr } = await admin
    .from("audit_jobs")
    .insert({ url, kind: "grade", user_id: null }) // persona_ids/reserved_calls/status use defaults
    .select("id").single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }
  const { data: scan, error: scanErr } = await admin
    .from("grader_scans")
    .insert({ job_id: job.id, entry_url: url }) // status defaults to 'queued'
    .select("token").single();
  if (scanErr || !scan) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }
  return NextResponse.json({ token: scan.token }, { status: 202 });
}
```

- [ ] **Step 3: Verify**

`pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build` in web. Confirm `/api/grade` appears in the build route tree.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/limits.ts web/src/app/api/grade/route.ts
git commit -m "feat(grader): grade rate-limit tier + POST /api/grade with queue backpressure"
```

---

### Task 6: Poll route + result loader

**Files:**
- Create: `web/src/app/api/grade/[token]/route.ts`
- Create: `web/src/lib/grade.ts`

**Interfaces:**
- Produces: `getGraderScan(token): Promise<GraderScanRow | null>` (public read via the anon/server client — the RLS policy allows it); GET route returns `{ status, report?, entryUrl, pagesVisited }`.

- [ ] **Step 1: Implement the loader + poll route**

```ts
// web/src/lib/grade.ts
import { createClient } from "@/lib/supabase/server";
export async function getGraderScan(token: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grader_scans")
    .select("token, entry_url, status, report, pages_visited, error, created_at")
    .eq("token", token).single();
  return data ?? null;
}
```
```ts
// web/src/app/api/grade/[token]/route.ts
import { NextResponse } from "next/server";
import { getGraderScan } from "@/lib/grade";
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scan = await getGraderScan(token);
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: scan.status, report: scan.report, entryUrl: scan.entry_url,
    pagesVisited: scan.pages_visited, error: scan.error,
  });
}
```
(Note the Next-16 async `params` shape — match the existing `audits/[id]` route's signature.)

- [ ] **Step 2: Verify** — `pnpm exec tsc --noEmit` + `pnpm build` in web; both routes in the tree.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/grade/[token]/route.ts web/src/lib/grade.ts
git commit -m "feat(grader): poll route + public scan loader"
```

---

### Task 7: Public result page + entry form

**Files:**
- Create: `web/src/app/grade/page.tsx` (entry)
- Create: `web/src/components/grade-form.tsx` (client: form + polling → redirect to `/grade/[token]`)
- Create: `web/src/app/grade/[token]/page.tsx` (server: renders `getGraderScan`)

**Interfaces:**
- Consumes: `getGraderScan` (Task 6); `POST /api/grade` + `GET /api/grade/[token]` (Tasks 5-6).
- The result page MUST render, verbatim, the honest-wall copy from Global Constraints and a waitlist CTA (link to `/for-agencies` / the existing waitlist). Show: big letter grade + score, per-impact table, WCAG-AA violation count, per-page list, and "Scanned N public pages only…". NO "compliant"/"WCAG pass" language anywhere.

- [ ] **Step 1: Entry form + poll (client)** — `grade-form.tsx`: controlled URL input → `POST /api/grade` → on `{token}` poll `GET /api/grade/[token]` every 3s until `status==='completed'|'failed'` (cap ~3 min) → `router.push('/grade/'+token)`. Reuse the audit-form polling/resilience pattern (transient-fetch tolerance; don't freeze the spinner on a blip). aria-live on status + 16px inputs (iOS no-zoom), matching the forensic design tokens.

- [ ] **Step 2: Result page (server)** — read `getGraderScan(token)`; if null → not-found UI; if `completed` render the report; if `queued`/`running` render a "still scanning, refresh" state. Follow forensic-terminal design (mono, severity tokens, `Meter` for the score, `SeverityChip` for impact rows — reuse `components/forensic/`).

- [ ] **Step 3: Verify** — web `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build`. `/grade` and `/grade/[token]` in the route tree.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/grade web/src/components/grade-form.tsx
git commit -m "feat(grader): public entry form + honest result page"
```

---

### Task 8: Dynamic OG image (shareability)

**Files:**
- Create: `web/src/app/grade/[token]/opengraph-image.tsx`
- (No new dependency — `next/og` ships with Next 16, verified resolvable.)

**Interfaces:**
- Consumes: `getGraderScan(token)`. Renders an `ImageResponse` (1200×630) with the domain + big letter grade + issue count, warm-dark forensic palette (literal hex — Satori has no CSS-var/oklch support; use `display:flex`/`block` only, no `inline-block` — a prior Satori build error).

- [ ] **Step 1** Implement `opengraph-image.tsx` importing `{ ImageResponse } from "next/og"`, reading the scan and drawing grade + `entry_url` host + `report.totalViolations`. Fallback image when scan missing/incomplete.
- [ ] **Step 2** Verify `pnpm build` prerenders the route without a Satori error; spot-check the generated image locally.
- [ ] **Step 3** Commit `feat(grader): dynamic OG image per grade result`.

---

## Self-Review

**Spec coverage:** scoring (T1), scan honesty+SSRF (T2), queue+public results (T3-4), enqueue+abuse limits (T5), poll+result+honest wall (T6-7), virality OG (T8). Embed badge + robots.txt courtesy + adaptive CAPTCHA are deferred follow-ups (noted, not silently dropped) — add only if abuse appears. VPAT + perf lens are separate roadmap items, out of this plan's scope.

**Global constraints honored:** axe-only/no-spend (T4-5), honest copy verbatim (T7), no fabricated composite (T1 real ratio + traceable table), SSRF on every hop + no allowPrivate/session (T2), anonymous rate-limit + page cap 10 (T2, T5), prod-migration is a validation zone Liz applies (T3).

**Type consistency:** `PageAxe`/`GradeReport`/`computeGrade` (T1) reused verbatim in T2/T4; `gradeScan` signature identical in T2 (impl), engine.d.ts (T4), worker call (T4); `grader_scans` columns identical across T3 migration, T4 writes, T5 insert, T6 read.

**Verified against real code (2026-08-01, not assumed):** `crawl()`/`Finding.severity` shapes (T1-2); `audit_jobs` schema — `persona_ids`/`reserved_calls`/`status` all defaulted, `user_id` nullable, `claim_audit_job` filters only `status='queued'` (kind-agnostic → claims grade jobs), reaper releases `reserved_calls=0` safely (T3-4); worker imports the engine as the `multipersonas` package + updates `audit_jobs` status itself + `releaseReservation` is a no-op at 0 (T4); engine tsconfig `declaration:true` → typed package export, no shim (T2/T4); `RATE_LIMITS` is a fixed const so a `grade` tier must be added (T5); `consumeRateLimit`/`createAdminClient` signatures (T5); `next/og` ships with Next 16 (T8). Corrections from that pass are baked into the tasks above.

**Open items for Liz (validation zones):** apply migration 015; add the smokescreen egress companion plan BEFORE promoting the grader to high-traffic public (SSRF surface widens); tune `GRADE_QUEUE_CAP` (default 25) + the `grade` rate tier (default 5/10min) vs Railway compute budget; a dedicated grader worker/queue or `kind='audit'` claim-priority is the escalation if grade volume starves audits.

## Companion plan (next)
Egress hardening (`smokescreen` two-service split on Railway) is a separate, infra-shaped plan — write it next so the grader launches on a hardened base. It closes the documented DNS-rebind TOCTOU (`url-guard.ts:174-179`).
