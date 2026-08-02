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
- **Node version:** engine + web target Node >=20 / CI Node 22. No new runtime deps in the engine beyond what axe/playwright already provide; `@vercel/og` is web-only.
- **Verification gate every task:** engine `pnpm test` + `pnpm exec tsc --noEmit`; web `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build`. All green before commit.

## File Structure

- `src/grader/score.ts` (NEW) — pure scoring: weights, page/site ratio, letter grade, WCAG-level rollup. No I/O. The TDD centerpiece.
- `src/grader/score.test.ts` (NEW) — unit tests for scoring.
- `src/grader/scan.ts` (NEW) — `gradeScan(entryUrl, opts)`: BFS public pages (reuse url-guard), run axe capturing violations + passes per page, return per-page weighted data + the computed grade. Isolated from `src/crawler/crawl.ts` so the honesty-walled product spine is untouched.
- `src/grader/scan.test.ts` (NEW) — a keyless source-guard test (no ANTHROPIC key needed) + a stubbed-page unit test.
- `web/supabase/migrations/015_grader.sql` (NEW) — `audit_jobs.kind` + nullable `user_id`; `grader_scans` public-read table.
- `web/src/lib/database.types.ts` (MODIFY) — regenerate/hand-add `grader_scans` + `audit_jobs.kind`.
- `worker/src/index.ts` (MODIFY) — branch claimed jobs on `kind`: `grade` → `gradeScan` → persist to `grader_scans`.
- `worker/engine.d.ts` (MODIFY) — expose `gradeScan` + its types to the worker.
- `web/src/lib/grade.ts` (NEW) — server helper: read a `grader_scans` row by token (public), shape it for the page.
- `web/src/app/api/grade/route.ts` (NEW) — POST: killSwitch → IP rate-limit → validate URL → enqueue `kind='grade'` → return `{ token }`.
- `web/src/app/api/grade/[token]/route.ts` (NEW) — GET poll: status + result by token.
- `web/src/app/grade/[token]/page.tsx` (NEW) — public result page (score, honest wall, table, waitlist CTA).
- `web/src/app/grade/[token]/opengraph-image.tsx` (NEW) — dynamic OG image (`@vercel/og`).
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

- [ ] **Step 5: Commit**

```bash
git add src/grader/scan.ts src/grader/scan.test.ts
git commit -m "feat(grader): public-only axe scan capturing passes+violations for honest scoring"
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
- Modify: `worker/src/index.ts` (branch claimed jobs on `kind`)
- Modify: `worker/engine.d.ts` (expose `gradeScan` + `GradeScanResult`)

**Interfaces:**
- Consumes: `gradeScan` from the engine build; the existing claim loop + `audit_jobs` row (now carrying `kind`).
- Produces: on `kind==='grade'`, writes `grader_scans` (status running→completed/failed, report, pages_visited) via the service-role Supabase client the worker already holds.

- [ ] **Step 1: Add the type shim**

In `worker/engine.d.ts`, add:
```ts
export interface GradeReport { grade: "A"|"B"|"C"|"D"|"F"; score: number; pagesScanned: number; totalViolations: number; byImpact: Record<string, number>; wcagAAViolations: number; perPage: { url: string; score: number; violations: number }[]; }
export interface GradeScanResult { entryUrl: string; report: GradeReport; pagesVisited: string[]; skipped: string[]; }
export function gradeScan(entryUrl: string, opts?: { maxPages?: number; onPage?: (url: string, i: number) => void }): Promise<GradeScanResult>;
```
(Point the worker's engine import path at the built `gradeScan` the same way it imports `runMultiPersonaTest` — verify the existing import style in `worker/src/index.ts` and match it.)

- [ ] **Step 2: Branch on kind in the claim loop**

In the job-processing block (where it currently calls `runMultiPersonaTest`), add — before the persona path — a `kind === 'grade'` branch:
```ts
if (job.kind === "grade") {
  await supabase.from("grader_scans").update({ status: "running" }).eq("job_id", job.id);
  try {
    const { report, pagesVisited } = await gradeScan(job.url, { maxPages: 10 });
    await supabase.from("grader_scans").update({
      status: "completed", report, pages_visited: pagesVisited,
    }).eq("job_id", job.id);
  } catch (err) {
    await supabase.from("grader_scans").update({
      status: "failed", error: err instanceof Error ? err.message : String(err),
    }).eq("job_id", job.id);
  }
  // mark the queue row done using the SAME mechanism the audit path uses (verify it)
  continue;
}
```
Match the exact "mark job complete" call the persona path uses (do not invent one). Grade jobs never reserve/release model spend (axe is keyless) — skip the spend calls entirely on this branch.

- [ ] **Step 3: Verify worker compiles**

Run (in `worker/`): `pnpm typecheck`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.ts worker/engine.d.ts
git commit -m "feat(grader): worker runs kind=grade jobs via gradeScan -> grader_scans"
```

---

### Task 5: Enqueue route `POST /api/grade`

**Files:**
- Create: `web/src/app/api/grade/route.ts`

**Interfaces:**
- Consumes: `killSwitchEnabled` (`@/lib/limits`), `consumeRateLimit` (`@/lib/rate-limit`), `assertUrlAllowed` + `BlockedUrlError` (`@engine/security/url-guard`), `createAdminClient` (`@/lib/supabase/admin`).
- Produces: JSON `{ token }` (202) that Task 7 polls. Inserts one `audit_jobs` row (`kind='grade'`, `user_id=null`, `url`) and one `grader_scans` row (`job_id`, `entry_url`, `status='queued'`) via the admin (service-role) client.
- Model the validation/limit ordering on `web/src/app/api/audit/route.ts:21-108` (killSwitch → rate-limit by IP → parse → validate URL). NO `reserveSpend` (axe is free). Rate-limit key: `grade:${ip}`, type `"anonymous"`.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { killSwitchEnabled } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";

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
  const rate = await consumeRateLimit(`grade:${ip}`, "anonymous");
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
  const { data: job, error: jobErr } = await admin
    .from("audit_jobs")
    .insert({ url, kind: "grade", user_id: null, status: "queued" })
    .select("id").single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }
  const { data: scan, error: scanErr } = await admin
    .from("grader_scans")
    .insert({ job_id: job.id, entry_url: url, status: "queued" })
    .select("token").single();
  if (scanErr || !scan) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }
  return NextResponse.json({ token: scan.token }, { status: 202 });
}
```
(Confirm the exact `audit_jobs` insert columns/status enum against the audit route + migration 005; adjust `status: "queued"` to match the queue's claimable state.)

- [ ] **Step 2: Verify**

`pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` in web. Confirm `/api/grade` appears in the build route tree.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/grade/route.ts
git commit -m "feat(grader): POST /api/grade enqueues anonymous axe-only grade jobs"
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
- Add dep: `@vercel/og` (web only)

**Interfaces:**
- Consumes: `getGraderScan(token)`. Renders an `ImageResponse` (1200×630) with the domain + big letter grade + issue count, warm-dark forensic palette (literal hex — Satori has no CSS-var/oklch support; use `display:flex`/`block` only, no `inline-block` — a prior Satori build error).

- [ ] **Step 1** Implement `opengraph-image.tsx` (`ImageResponse` from `next/og` if available in Next 16, else `@vercel/og`) reading the scan and drawing grade + `entry_url` host + `report.totalViolations`. Fallback image when scan missing/incomplete.
- [ ] **Step 2** Verify `pnpm build` prerenders the route without a Satori error; spot-check the generated image locally.
- [ ] **Step 3** Commit `feat(grader): dynamic OG image per grade result`.

---

## Self-Review

**Spec coverage:** scoring (T1), scan honesty+SSRF (T2), queue+public results (T3-4), enqueue+abuse limits (T5), poll+result+honest wall (T6-7), virality OG (T8). Embed badge + robots.txt courtesy + adaptive CAPTCHA are deferred follow-ups (noted, not silently dropped) — add only if abuse appears. VPAT + perf lens are separate roadmap items, out of this plan's scope.

**Global constraints honored:** axe-only/no-spend (T4-5), honest copy verbatim (T7), no fabricated composite (T1 real ratio + traceable table), SSRF on every hop + no allowPrivate/session (T2), anonymous rate-limit + page cap 10 (T2, T5), prod-migration is a validation zone Liz applies (T3).

**Type consistency:** `PageAxe`/`GradeReport`/`computeGrade` (T1) reused verbatim in T2/T4; `gradeScan` signature identical in T2 (impl), engine.d.ts (T4), worker call (T4); `grader_scans` columns identical across T3 migration, T4 writes, T5 insert, T6 read.

**Open items for Liz (validation zones):** apply migration 015; add the smokescreen egress companion plan BEFORE promoting the grader to high-traffic public (SSRF surface widens); decide max concurrent grade jobs vs Railway/spend budget.

## Companion plan (next)
Egress hardening (`smokescreen` two-service split on Railway) is a separate, infra-shaped plan — write it next so the grader launches on a hardened base. It closes the documented DNS-rebind TOCTOU (`url-guard.ts:174-179`).
