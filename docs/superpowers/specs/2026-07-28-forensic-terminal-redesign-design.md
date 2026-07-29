# Personaudit — "The Instrument" redesign (forensic evidence terminal)

**Status:** Phase A built + visually verified (dark/light desktop + mobile), on branch `feat/forensic-terminal-redesign`, NOT committed — pending Liz sign-off before ship. Phases B/C/D not started.
**Date:** 2026-07-28
**Scope:** marketing + app (full unified system), phased
**Written against:** commit `109fe41` (main)

## 1. Concept

Personaudit is a diagnostic instrument that demonstrates its own accuracy. The premise of
the product *is* accessibility expertise, so every design choice doubles as a credibility
proof: visible focus rings, AA+ contrast, colorblind-safe severity, keyboard demos,
reduced-motion support. These are not compliance checkboxes bolted on — they are the
marketing. Dogfooding is the differentiator.

Direction: **forensic evidence terminal** — dark-first, monospace-forward, the live
audit-log as the hero, data-dense, restrained. Segmented per surface: terminal-forensics
for the hero, regulatory-evidence discipline + citations for reports, observability-console
for the dashboard. Never all blended on one screen.

Intensity: **confident-restrained**. Distinctive and expert, no gimmicks. Grain + mono +
severity color do the work; teal used sparingly; motion subtle; focus rings are the
flashiest element.

## 2. Competitive differentiation (why forensic-terminal wins here)

A visual teardown of the category (accessiBe, UserWay, AudioEye, EqualWeb, Deque axe
DevTools, Silktide, Pope Tech, WAVE, Stark, Level Access) found one shared uniform. We
deliberately occupy the white space none of them touch.

**DO NOT look like the category** (these are their shared tropes):
- Blue-to-purple/pink gradient brand signature (UserWay's exact trope, echoed everywhere)
- Navy + white "authoritative SaaS" base — the uniform across all 8+ sites
- "Trusted by [logo wall]" social-proof strips; G2 / Trustpilot / Capterra star-badge clusters
- Stock photography of diverse people at laptops; the "accessibility person" icon
- Dual-CTA hero ("Book a demo" / "Start trial") + floated polished product screenshot
- Checkmark / shield feature-list icons
- Vague scale claims ("127,000+ brands") standing in for actual evidence
- Vocabulary of "compliance / protection / solution"

**Own this instead** (confirmed-empty territory):
- **Dark warm background as brand identity** — nobody in the category is dark-themed.
- **Monospace-branded evidence** — nobody uses code type in the hero.
- **Raw audit-log / terminal output front-and-center** — everyone shows polished dashboard
  mockups; nobody shows the actual evidence stream.
- **A real report / VPAT-lite excerpt on the homepage** — nobody shows a sample report at
  all. Personaudit already ships the VPAT-lite export (commit `242a22b`); surface a real
  excerpt as hero credibility.
- **Diagnostic markers on real content** (the WAVE / Sa11y pattern) rather than an
  abstract dashboard mock.
- **Forensic / legal-evidence vocabulary** — "violation record," "audit trail,"
  "reproducible," "cited to WCAG." Owns a register the whole category avoids.
- **Mechanism stats as engineering fact, not vanity** — "axe-core, deterministic," "crawls
  behind login," states-reached counts — never "trusted by N brands."

## 3. Anti-patterns (do NOT do)

Purple-pink AI-slop mesh gradients; rainbow (5+) severity palettes; shimmer "AI thinking"
text on the log (must look like real tool output, not a chatbot); color-only status; fake
traffic-light window dots (reads 2019); autoplaying unpausable hero; cutesy mascots;
euphemizing "WCAG violations" as "smart checks." Plus everything in the DO-NOT list above.

## 4. Locked decisions

- **Serif document voice: yes.** Source Serif 4 for report verdict body, WCAG citations,
  and guide prose. Mono + sans everywhere else. Mixing serif into a dev tool is the
  category differentiator.
- **Personas: procedural monograms.** Deterministic mono initial tiles in a neutral,
  severity-free palette. No image-gen dependency; reproducible; avoids the cutesy-mascot
  anti-pattern.
- **Report stays white paper / dark ink.** `report.module.css` is a print-safe compliance
  document by design — that premise is untouched. Only its typography (serif verdict body,
  mono rule IDs, WCAG citations, count tiles) and on-screen frame (console toolbar) are
  upgraded. The paper stays paper; print CSS untouched.
- **Synthetic-persona-cursor set-piece: cut to stretch (phase-2, optional).** The existing
  `audit-terminal` already tells the "Margaret blocked at payment" story; a second animated
  cursor is redundant effort that upstages the evidence and breaks confident-restraint.

## 5. Token system

### 5.1 Fonts (layout.tsx + globals.css)
Current state: Inter (`--font-sans`) + DM Serif Display (`--font-display`); mono is
referenced in `globals.css` as `--font-geist-mono` but **never loaded** (dead var). Fix:

- **Mono** — add **JetBrains Mono** via `next/font/google` as `--font-mono`; update the dead
  `--font-geist-mono` reference to `--font-mono`. Logs, rule IDs, counts, meters, tool
  labels, host names, the wordmark accent. Supports `tabular-nums`.
- **Sans** — keep **Inter** (`--font-sans`). Copy, CTAs, UI.
- **Serif** — add **Source Serif 4** via `next/font/google` as `--font-serif` (document
  voice). **Retire DM Serif Display** — it is a display face, wrong for body. Headings use
  Inter tight; documents use Source Serif 4.

### 5.2 Color (globals.css) — verified WCAG AA, both themes, in sRGB gamut
All pairs computed and checked (script in scratch); severity colors pass AA **as text**, so
they are safe in the log lines, not only as dots. Light-mode teal/serious/moderate were
chroma-clamped to stay in sRGB gamut.

| Token | Dark | Light | Min contrast (dark / light) |
|---|---|---|---|
| background (warm near-black) | `oklch(0.15 0.006 70)` | `oklch(1 0 0)` | — |
| card | `oklch(0.19 0.006 70)` | `oklch(0.985 0.003 70)` | — |
| foreground | `oklch(0.96 0.004 70)` | `oklch(0.18 0.006 70)` | 17.5 / 18.8 |
| muted-foreground | `oklch(0.68 0.01 70)` | `oklch(0.50 0.01 70)` | 6.8 / 6.0 |
| teal — active/live/cursor ONLY | `oklch(0.72 0.12 195)` | `oklch(0.52 0.087 195)` | 8.3 / 5.3 |
| severity critical | `oklch(0.65 0.20 25)` | `oklch(0.52 0.20 25)` | 5.5 / 6.1 |
| severity serious | `oklch(0.72 0.16 55)` | `oklch(0.55 0.134 55)` | 7.6 / 5.1 |
| severity moderate | `oklch(0.80 0.13 85)` | `oklch(0.56 0.113 85)` | 10.5 / 4.7 |
| severity minor | `oklch(0.70 0.12 250)` | `oklch(0.50 0.14 250)` | 7.4 / 6.0 |

- **Teal demoted** — cursor / active-log-line / "live" pulse accent ONLY. Remove blanket
  teal-on-every-CTA. Restraint = credibility.
- **Severity** — axe vocabulary (critical/serious/moderate/minor), hue-distant + colorblind-
  safe, always **color + icon + text**. Minor (hue 250) is deliberately pulled away from
  active-teal (195) so severity and "live" never collide.
- **Grain** — 2-3% noise on dark hero backgrounds to prevent gradient banding. Constraint:
  grain sits **behind** content / on solid-card-backed text only; never reduces text
  contrast below the AA values above.
- **Radius** — tighter/flatter than the soft shadcn pill (regulatory-evidence discipline).
- Note: light-mode `moderate` at 4.70:1 is a thin AA pass; keep it for chips (dark text on
  a moderate-tinted chip is the common use), and never use light-mode moderate as small
  body text below 4.5:1 context.

### 5.3 Light mode ("paper lab" variant)
Dark is the default (dark-first, no-FOUC script already in `layout.tsx`). Light mode is a
supported first-class variant, not the star: warm off-white ground, same mono / severity /
type system, teal still demoted. The **report is always paper** regardless of app theme.

## 6. Component language

- **Terminal / log** (upgrade `components/audit-terminal.tsx`, the anchor asset):
  - Drop the fake window dots → real prompt line + host label + single live dot.
  - Lines stagger in 40-80ms apart (already time-driven; tune cadence), never pasted.
  - Dim source tags per line: `[axe-core]`, `[persona:checkout-flow]`.
  - Active line gets the teal cursor block.
  - On completion the card **transforms** — collapses to summary chips (violations count +
    task-success fraction + export), not just stops.
  - Keep the reduced-motion static frame + `aria-label` full-text alternative.
  - **Mobile:** the log scrolls horizontally inside its own `overflow-x:auto` container
    (or wraps with a hanging indent) — mono lines never break page layout.
- **Report / VPAT excerpt block** — a real (sample) violation-record excerpt rendered as
  the homepage credibility piece; serif verdict text + mono rule IDs + WCAG citation. Reuses
  the report component's language so marketing and product agree.
- **Box-drawing dividers** (`┌─┐│└┘`) as a subtle section/card motif.
- **Severity chip** — color + icon + text, tabular rule id (`wcag-1.4.3`).
- **Count / meter** — `tabular-nums` on every count and percentage; CI-style fractions
  (`7/10 personas completed checkout`); thin progress bars; no glossy pie/percentage.
- **Focus-visible ring** — designed as a hero feature: thick, offset, teal. A "tab through
  me" demo on the marketing page shows keyboard nav off. (Cheap, high-credibility — kept.)
- **Live contrast badge** — `4.8:1 AA ✓` beside representative text samples. (Cheap — kept.)
- **WCAG citation hovercard** — `[WCAG 1.4.3]` on every violation, hover/focus → success
  criterion. Built on **`@base-ui/react`** (already a dependency) — no new deps.
- **Monogram tile** — deterministic persona avatar (mono initial, neutral palette).
- **Wordmark** — "Personaudit" with a mono/bracket or cursor accent (small signature move).
- **Buttons** — flat, sharper radius; mono labels for tool actions, sans for CTAs.
- **Empty / loading / error states** (files exist: `error.tsx`, `loading.tsx`,
  `not-found.tsx`, `global-error.tsx`) — terminal-native: empty = a prompt line ("no scans
  yet — point it at a URL"); loading = the running-log / scanline; error = a `fail` line in
  severity color with a retry prompt.

## 7. Per-surface plan

| Surface | Move |
|---|---|
| **Home** (`app/page.tsx`) | Rebuild from the generic shadcn stack. Hero = live audit-terminal + tight headline + focus-ring dogfood demo. Add a real VPAT/report excerpt block. How-it-works as a run-log. "What you get" = real severity chips + task-success meter. Grain on hero. NO logo wall / star badges / stock photos. |
| **/for-agencies** | Keep the sharper editorial spine, re-skin to the unified system. Liability stats → observability count-chips (tabular-nums). Reuse terminal + severity components. |
| **Guides** (3) | Document voice: serif reading body, mono rule refs, inline contrast badges, clean single reading column. |
| **Auth** (login/signup/forgot/update) | Terminal-framed cards; focus rings showcased — keyboard users land here, make it exemplary. |
| **App shell** (`(app)/layout.tsx`, `app-nav.tsx`) | Observability console: sidebar/topnav with mono labels + live/status affordances. |
| **Dashboard** | Bento console: scan form = "new scan" console input; recent audits as log rows; severity roll-up chips; task-success fractions. |
| **Audits list + detail** | Log/table density; axe-vocab severity grouping; states-reached count. |
| **Report** (`audits/[id]/report`) | **Paper stays paper** (print CSS untouched). Upgrade typography (serif verdict body, mono rule IDs, WCAG citations, count tiles) + on-screen console-toolbar frame. Consistent with VPAT-lite export. |
| **Personas** (`persona-card.tsx`) | Kill random Tailwind avatar colors → deterministic monogram spec-sheet tiles; tech/connection/patience as instrument readouts. |
| **Settings / projects / waitlist** | Re-skin to system primitives; low-effort once tokens + components land. |
| **Metadata art** | Update `opengraph-image.tsx`, `apple-icon.tsx`, and `theme-color` (currently `#1a1a2e` → warm-dark) to the new system. magica MCP optional for OG art. |

## 8. Motion + accessibility (the credibility layer)

- All motion via IntersectionObserver + `prefers-reduced-motion` (proven in
  `audit-terminal.tsx`).
- No autoplaying unpausable hero; reduced-motion gets a complete static frame.
- Full keyboard navigation, visible focus everywhere, colorblind-safe severity, AA+
  contrast — and the marketing surfaces actively **show** these off.
- **AA guardrail:** mono body text min 14px (dense log may be 13px only where verified AA,
  which the palette above satisfies at high ratios); grain never over text.
- Verifiable, not aspirational: the redesign's own axe-core score is a success criterion —
  the product scans its own site.

## 9. Build order + phasing (informs the plan, not the plan itself)

Honest scope note: marketing + app is large. Ship the flagship first to prove the language
before grinding low-traffic surfaces (settings / projects / waitlist).

1. **Phase A — foundation + flagship (highest ROI):** token layer (fonts, warmed dark base,
   demoted teal, verified severity, grain, radius) → shared components (terminal upgrade,
   severity chip, count/meter, focus ring, contrast badge, citation hovercard, VPAT excerpt,
   monogram, divider) → **Home**. This proves the whole language on one page.
2. **Phase B — rest of marketing:** for-agencies, guides, auth, metadata art.
3. **Phase C — app:** shell/nav, dashboard, audits list/detail, personas, report typography.
4. **Phase D — tail + verification:** settings/projects/waitlist re-skin; empty/loading/error
   states; axe-core self-scan (dogfood), keyboard pass, reduced-motion pass, both themes,
   contrast audit.

Approval can be staged: sign off Phase A, see it live, then continue.

## 10. Success criteria

- One coherent visual language across every marketing and app surface (no more generic-home
  vs editorial-for-agencies split).
- The live audit-terminal is the recognizable signature of the brand.
- The site looks like **none** of the category competitors (dark, mono, evidence-forward).
- Severity is colorblind-safe and never color-only, everywhere it appears.
- The redesigned marketing pages pass their own axe-core scan (dogfood proof).
- Report remains a valid print-safe compliance document.
- No new heavyweight dependencies beyond two Google fonts (JetBrains Mono, Source Serif 4);
  citation hovercards reuse `@base-ui/react`.
