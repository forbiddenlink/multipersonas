# Personaudit — Improvement Roadmap (research-grounded)

Snapshot as of 2026-08-01. Written against `188ebe4` (main). This is a destination
doc: freeze it, let reality live in the code + issues. Re-validate file:line refs if
HEAD has moved.

**STALE (2026-09-19):** every priority below has shipped: the public grader + egress
hardening (`web/src/app/grade`, `api/grade`, `worker/entrypoint.sh` smokescreen) and
the sharper persona (axe findings fed to the agent, `src/agent/engine.ts`). Kept for
the rejection rationale and research citations, not as a live roadmap.

Source: 8 parallel research threads (4 landscape: competitive / demand / OSS / tools;
4 deep: a11y-tree nav / grader+VPAT / egress / live code-map). Full agent reports in
`.claude/cache/agents/research-agent/`.

## The one insight that drives everything

The **authenticated crawl is not the moat.** Deque axe Monitor, UserWay Monitor,
A11y Pulse, and TestKase all scan behind login; TestKase publicly markets the exact
"90/10 behind-login problem" Personaudit is built on. Every load-bearing piece is a
free, 100k-star commodity (browser-use/Skyvern for nav, axe for compliance, rrweb for
replay). A funded competitor could bolt axe onto Skyvern in weeks.

**The defensible moat = the fusion nobody else ships** — axe verdict + persona
*task-success* + journey replay, honesty-walled — **plus credentials-stay-local trust.**
So: deepen the persona/trust layer, or create demand. Do NOT add commodity scanning.

Second hard truth (from every strategy note + all 4 landscape threads): **demand is the
bottleneck, not product quality.** Zero traffic, 10 unsent outreaches. Build the thing
that creates signal.

## What the code-map corrected

The external research assumed we were vision-based and behind on tooling. The code says
otherwise (verify-before-asserting win):

- **Already a11y-tree based.** `engine.ts:401-420` `getPageContext()` uses
  `page.locator("body").ariaSnapshot()` (truncated 4000 chars); no screenshots sent to
  the model. The research's "#1 ROI: switch to a11y-tree nav" is *mostly already done* →
  its marginal value collapsed. Only a narrow refinement remains (`{ref:true}`).
- **`mpersonas scan` (`cli.ts:63`) is already an axe-only, no-LLM path** and `crawl()`
  (`src/crawler/crawl.ts`) is entry-agnostic → the public grader is nearly free to build.
- **Axe findings are NOT fed to the agent** (`engine.ts:504` hook) → "axe feeds the
  agent" is genuinely unbuilt.
- **url-guard TOCTOU is documented** (`url-guard.ts:174-179`) → egress proxy closes it.

## Priority sequence (my judgment, corrected)

### ① Free public grader + egress hardening — SHIP AS ONE BUNDLE  ★ top pick
Attacks the real bottleneck (demand) and is code-cheap. Bundle egress with it because a
public anonymous scanner *increases* the SSRF/DNS-rebind surface — harden as you open it.

**Grader (reuse, don't rebuild):**
- New web route mirroring `api/audit/route.ts`'s validate→rate-limit→spend chain, but
  calls `crawl()` (axe-only) instead of enqueuing a persona job. Worker-routed (needs
  Chromium). Zero new scan logic.
- **Scoring — Deque's own documented weights** (not a fabricated composite; we killed one
  already): `critical×4 + serious×2 + moderate×1 + minor×0.5`; page score =
  passed-weight / (passed+failed weight); site score = arithmetic mean per page (not
  gameable by page count). Report the ONE number beside a raw per-impact / per-WCAG-SC
  table so it's traceable. WCAG A/AA rollup shown separately from the composite.
- **Honest wall (the anti-overlay-vendor move):** "Scanned N public pages only. Doesn't
  see behind login, PDFs, or real user flows. A full audit — logged-in task-success
  testing — is what protects you." CTA → waitlist/booking, never a paywall on the score.
- **Virality (genuine whitespace — no dev-tool OG-per-result precedent found):** dynamic
  OG image per scan (`@vercel/og`: URL + grade + issue count) so shares render in
  Slack/Twitter; auto-refreshing embed SVG badge (OpenSSF Scorecard shape) → backlink →
  discovery.
- **Abuse controls:** per-IP graduated (burst + sustained) limits, page-count cap per
  scan, queue backpressure (429 + Retry-After), global concurrent-scan cap tied to spend,
  adaptive (not always-on) CAPTCHA, robots.txt courtesy. Existing url-guard + durable
  rate-limit + spend-cap already cover the base.

**Egress (`smokescreen` two-service split on Railway):**
- Second Railway service running `stripe/smokescreen`; worker reaches it over private
  networking (`http://smokescreen.railway.internal:4750`). Playwright launched with
  `proxy:{server:...}` so ALL Chromium traffic (incl. subresources) routes through it.
- smokescreen resolves→validates→dials atomically per connection → closes the documented
  TOCTOU (`url-guard.ts:174-179`) that app-level checking can't. Deny CIDRs: RFC1918,
  `169.254.0.0/16`, loopback, IPv6 ULA `fc00::/7` + link-local `fe80::/10`.
- Keep the existing `assertRequestAllowed` route guard as defense-in-depth.

### ② Sharper persona (small, deepens the moat) — cheap
- **Axe feeds the agent** (unbuilt): inject recent `axeFindings` for the current page as a
  read-only "KNOWN AXE VIOLATIONS (ground truth, do not re-derive or dispute)" system
  message around `engine.ts:504`. Stops the persona re-discovering what axe caught.
  **Honesty wall:** axe stays its own DB field, computed before persona output, never
  mutated by model text; merged only at render (`report/generator.ts` already splits by
  `renderAxeSection` vs persona findings — preserve it).
- **`{ref:true}` action-mapping refinement:** upgrade `ariaSnapshot()` →
  `ariaSnapshot({ref:true})` + act via `page.locator('aria-ref=<ref>')` for reliable
  role+name element identity, replacing the blunt 4000-char truncation with structured
  interactive-element extraction. Re-snapshot each turn (refs are turn-scoped).
- **Do NOT adopt Stagehand** — it seizes the control-flow loop (violates own-your-control-
  flow) for convenience we don't need on a working hand-rolled loop.

### ③ New billable lenses — demand-gated (after signal)
- **Perf lens** (Unlighthouse / Lighthouse programmatic, same Chromium worker): a 3rd
  deterministic output alongside axe(compliance) + persona(UX), same verdict-vs-opinion
  framing.
- **VPAT/ACR generator** (monetizable resell): map axe WCAG tags (`wcag2aa`, `wcag143`) →
  VPAT 2.5 SC rows. **Default every unmapped SC to "Not Evaluated"** — never infer
  Supports from absence-of-violation (axe covers ~30-40% of WCAG; the rest needs a human,
  and the doc must say so). Prior art: Wally, GSA/openacr YAML.
- **IBM Equal Access** as a *complementary* engine (separate table, never merged into the
  axe verdict) — more rule coverage without breaking the wall.

### Deferred (YAGNI until a reason)
- **rrweb DOM replay** — big payoff, big rebuild of Replay Theater storage. Wait until
  screenshots demonstrably limit sales.
- **Billing/Stripe** — hold until demand evidence (existing constraint).

## Willingness-to-pay test (parallel to ①, no code)
Cheapest signal per the demand thread: concierge-audit 3-5 target agencies free, ask
directly "would you pay $X/mo." Plus the grader as top-of-funnel. ADA urgency backdrop:
8,667 federal ADA suits in 2025, 3,117 website-specific (+27% YoY); 22.6% targeted
overlay sites — the honest-audit angle sells against overlays.

## Considered & rejected
- Adopt browser-use/Skyvern for nav — REJECTED: we're already a11y-tree based; adds a
  framework dependency + cedes control flow.
- "Switch from vision to a11y-tree" (research #1) — REJECTED as already-done.
- Browserbase hosting — REJECTED: moves auth sessions to a third-party cloud, breaks the
  credentials-stay-local wall. Steal the egress *pattern* only.
- Synthetic-human persona avatars — REJECTED (brand wall, no synthetic humans).
