# Personaudit — Competitive Analysis

**Snapshot as of 2026-07-31. Frozen research doc — do not edit to "keep current"; write a new dated one.**
Written against `main` after the design + a11y + eval-gate pass.

## Landscape (grounded, sourced)

| Name | Category | Behind login? | Gap Personaudit exploits |
|---|---|---|---|
| axe DevTools (Deque) | Dev tool + CI | No (free/Pro tier) | No persona/task-success; static DOM only |
| **axe Monitor (Deque)** | Enterprise monitoring | **Yes** (scripted flows) | $15K–$250K/yr, enterprise IT; no "did the user succeed" verdict |
| Pa11y / Pa11y-CI | Free OSS CI | Manual (DIY Puppeteer login) | No persona reasoning, no multi-client reporting |
| axe-core GH Actions (axle) | Free CI gate | No | ~57% WCAG coverage; zero persona layer |
| Lighthouse / WAVE / A11y Insights | Free scanners | WAVE ext manual, 1 page | No multi-site, no journeys, no CI gate |
| accessiBe / UserWay / AudioEye | Overlay widgets | No (cosmetic) | FTC fined accessiBe $1M (2025); 800+ overlay sites still sued |
| Siteimprove / Level Access | Enterprise monitoring | Limited/claimed | Too heavy/expensive for sub-$25M agencies |
| Evinced | Dev platform | Ext on already-logged-in tab | No persona/task-success; not agency-packaged |
| **TestParty** | AI remediation + monitoring | Unclear | Nearest funded threat: AI + fixes + agency pricing, BUT sells fixes not a labeled dual-verdict |
| Fable | Real disabled testers | Yes (humans) | Boundary, not competitor — we defer to them explicitly |
| Stark / Polypane | Design/dev a11y | No | Different buyer moment, not CI/compliance |
| PersonaIQ | AI persona UX (conversion) | No a11y layer | Validates the AI-persona category; nobody pairs it with axe verdicts |

Sources captured in the research (Deque pricing/docs, FTC accessiBe order, TestParty, Vendr, criplife/Fable, etc.).

## Verdict

**Defensible wedge:** CLI-local, credentials-never-leave-machine authenticated scanning + CI gating at agency price. Deque axe Monitor is the only incumbent doing authenticated business-flow scanning — but enterprise-priced and server-based (their crawler touches the client's login). **Nobody markets local-credential-privacy as a feature.** Nobody pairs a deterministic axe verdict with a clearly-separated, explicitly-non-compliance AI "did the user finish the task" signal.

**Exposure (the load-bearing risk):** the core primitive — axe-core + Playwright login script + a GitHub Action — is FREE today (Pa11y-CI, axle). A competent freelancer replicates "axe behind login in CI" in ~20 lines. **The moat is NOT the capability — it's the packaging + the credential-privacy story + agency multi-site rollup.** TestParty is the nearest well-funded threat.

## Moat moves (ranked by leverage) — mostly POSITIONING, not features

1. **Headline the CI-gate + local-credential-privacy combo** — "your client's password never leaves your laptop." That's the actual agency objection to SaaS crawlers touching client logins. Today it's buried in the hero *subhead*, not the headline.
2. **Multi-site/multi-client report rollup** — one dashboard across N client projects. Enterprise doesn't optimize for it; DIY axe scripts can't do it. **Already partially built (Projects) — complete/sharpen, don't invent.**
3. **Contractually-legible task-success/compliance split** — a report an agency can hand a client's lawyer. Product-design asset TestParty/Deque don't offer. (VPAT-lite export exists — extend its legal legibility.)
4. **Public pricing** — enterprise vendors hide it; agencies resent that. (DEMAND-GATED per Liz's plan — hold until reply signal.)
5. **Explicit non-overlay positioning** — ride the FTC/accessiBe backlash; agencies are searching "not an overlay" now.

## What this means for "do we need more?"

- **More personas: NO.** Nobody competes on persona count; the task-success *split* is the differentiator, not the number. Custom personas already supported.
- **More features: mostly NO.** 4 of 5 moat moves are positioning/packaging/copy, not new capability. The one feature-shaped move (#2 multi-site rollup) is already partially built.
- **The real gap is DEMAND + POSITIONING, not capability.** The product is feature-complete for the wedge. The next dollar goes to outreach + sharpening the credential-privacy / anti-overlay / legally-legible framing — all of which are copy/strategy calls (Liz's voice), not engineering.
