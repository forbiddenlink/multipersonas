# Personaudit current site and product surface baseline (as of 2026-10-10)

Method: live HTTP fetch of https://personaudit.com pages (curl, HTML parsed locally), Lighthouse 12 CLI (mobile default, throttled), repo read under /Volumes/LizsDisk/multipersonas/web/src, local review in /Volumes/LizsDisk/multipersonas/functional-review/. Firecrawl was out of credits; the lighthouse MCP timed out, so the Lighthouse CLI was used instead. Not done: running a free /grade scan (form gated by Turnstile "Checking you're human"; skipped), signed-in app visual review (no account; read-only constraint), manual screen reader pass.

## 1. What exists: route and feature inventory

### Takeaway
The surface is small, coherent and unusually honest: 15 sitemap URLs, 5 guides, a CLI docs page, a pricing ledger, a sample report, plus a full signed-in app. It lacks the buyer-trust layer (security, changelog, status, about, comparison, testimonials, API docs).

### Cited Findings
- Public routes in repo: `/`, `/pricing`, `/for-agencies`, `/grade`, `/grade/[token]` (shareable result with OG image and badge API), `/sample-report`, `/docs`, `/guides` + 5 guides, `/accessibility`, `/privacy`, `/terms`, `/auth/{login,signup,forgot-password,update-password,callback}` — web/src/app (find listing); sitemap lists 15 URLs — [sitemap.xml](https://personaudit.com/sitemap.xml), web/src/app/sitemap.ts:7-23
- Signed-in `(app)` routes: `/dashboard`, `/projects`, `/projects/[id]`, `/audits/[id]`, `/audits/[id]/report`, `/personas`, `/settings`, `/waitlist` — web/src/app/(app)/*
- API routes: audit, audit/[jobId], billing/portal, checkout/founding, checkout/solo, grade, grade/[token], grade/[token]/badge, grade/claim, health, personas, schedules/notify, schedules/run-due, stripe/webhook, waitlist — web/src/app/api/*. None are documented publicly.
- Live 404s (no page exists): /changelog, /status, /security, /about — curl 2026-10-10. Custom 404 page exists (web/src/app/not-found.tsx).
- robots.txt allows assistant crawlers, points to /llms.txt (which exists and states the product split and "not a disability simulator" rules) and sitemap; blocks Bytespider; Disallow `/grade/` (result pages) — [robots.txt](https://personaudit.com/robots.txt), [llms.txt](https://personaudit.com/llms.txt)
- Global footer: Free grade, Sample report, Pricing, For agencies, CLI docs; 5 field guides; Accessibility statement, Privacy, Terms, hello@personaudit.com; credit "Built by Elizabeth Stein" linking to GitHub. Nav: Agencies, Pricing, CLI docs, Guides, Sign in, "Grade a site free" CTA.
- Local review (functional-review/coverage.md, improvements.md, 2026-09-29): 17 public pages crawled locally, 24 screenshots at 390/768/1440, 467 root/worker + 420 web tests, 11 SQL scripts pass; fixed worker Docker build, health false-green, project-cap error hidden, fast-uri advisory, history status bug, recovery counts, worker HTTP deadlines. Found and fixed CLAIM-001: sample report implied paid hosted behind-login scanning (coverage.md "Findings and repairs"). Open items: no worker liveness heartbeat, no Stripe sandbox reconciliation, demand/retention unknown, hosted backup policy unverified, real email delivery and live Turnstile unverified (coverage.md, improvements.md rows C).
- Experiments folder: `net-new-violations` (4 public demo targets), `personas-vs-crawler` (pre-registered head-to-head), `task-success-validity` (assertion benchmark, saved-task results 2026-09-19/23) — /Volumes/LizsDisk/multipersonas/experiments/

### Inferences
- The product is deeper than the marketing site shows: scheduling, retest compare, projects, badge API and claim flow are not explained on any docs page.
- Public API routes (grade, badge) are undocumented, so a dev-tool buyer cannot discover them.

### Gaps
- Signed-in app visual quality and empty states were not seen live. Code shows `FirstRunEmpty` on dashboard (page.tsx:86) and `EmptyPrompt` on projects (page.tsx:131) and personas (page.tsx:69), so empty states exist.
- Did not run a live grade (Turnstile-gated).

## 2. Page-by-page copy, CTAs, meta (live)

### Takeaway
Titles, descriptions, canonical, OG and Twitter cards, JSON-LD are present on every page checked. Copy is specific and defensible. The primary CTA path is clear: Grade a site free, then pricing.

### Cited Findings
- Home title "Personaudit: axe-core accessibility evidence for agencies and dev teams"; H1 "Grade your client's website. Know what to fix first."; sub: "Your first grade is free, with no account"; form with Turnstile; hero strip Grade/Coverage/Evidence — [home](https://personaudit.com/)
- Home sections in order: grade form, SauceDemo "Case PA-0426" evidence card (3 critical, 0 on public page), "The homepage passes. The bugs are behind the login." crawl map (6 states), probe ledger (saucedemo 0 public / +3 net new; orangehrm 1 / +35; the-internet 44 / +5; applitools 5 / 0, last row shown as null result), 4-step CLI procedure, deliverable list (fix first, status per finding, copy as issue to GitHub/Jira/Linear, retest compare, CSV and print, white label), persona layer with replay widget, deadlines strip, final CTA — [home](https://personaudit.com/)
- OG image: one dynamic 1200x630 PNG, alt "Personaudit: scan behind the login, keep the password", reused on all pages (home and pricing share the same `opengraph-image?14422e922a6c4c70` URL); `/grade/[token]` has its own opengraph-image.tsx — web/src/app/opengraph-image.tsx:5,38; web/src/app/grade/[token]/opengraph-image.tsx
- JSON-LD: SoftwareApplication on all pages; FAQPage on /pricing and /for-agencies — [pricing](https://personaudit.com/pricing), [for-agencies](https://personaudit.com/for-agencies). No Organization, BreadcrumbList, Article/HowTo on guides observed in the three HTML files checked (home, pricing, for-agencies); guides not JSON-LD-checked.
- Pricing: Free $0 (CLI, behind-login on own machine, CI gate, hosted grade up to 10 pages, 1 hosted project); Solo $39/mo (5 projects, scheduled re-scans, persona task-success on public flows, retest compare, exportable evidence report, Personaudit-branded); Agency founding $199/mo (unlimited projects, white-label, founding price locked); both paid tiers "14-day free trial, card up front"; capability ledger row "Hosted behind-login scan: Not built. Agency founding funds it." Roadmap on all plans; named competitor prices checked "As of Oct 2026" (Pope Tech Free/25 pp, Team $25, Business Plus $225 incl. behind login, Professional $400; Silktide quote-only 12-month minimum) — [pricing](https://personaudit.com/pricing)
- Solo $39 is live on production (STRIPE_SOLO_PRICE_ID is set); the header said it would show only if the env var is set — [pricing](https://personaudit.com/pricing), web/src/lib/plans.ts:26
- Pricing page says "Founding" but the task brief called it pre-order; live copy sells a working hosted workspace with a trial, not a pre-order — [pricing](https://personaudit.com/pricing)
- /for-agencies: "Show every client what to fix first."; EAA, ADA Title II dates, $1,000,000 FTC overlay-vendor settlement; 3-step workflow; illustrative multi-client roster flagged "not real client data"; "We don't sell a fix. We sell the truth."; Fable (makeitfable.com) referral for real disabled testers; FAQ — [for-agencies](https://personaudit.com/for-agencies)
- /sample-report: "Real probe of the SauceDemo test store, not a customer", executive summary 3 critical, findings with WCAG 4.1.2 citation and Deque University links, state map, persona replay, method and limitations — [sample-report](https://personaudit.com/sample-report)
- /docs: single page (install, save session, run scan, baseline + CI gate, personas, troubleshooting), "Last reviewed 26 September 2026" — [docs](https://personaudit.com/docs)
- /guides: 5 guides (WCAG 2.2 AA checklist, 10 most common issues, 2025-2028 deadlines, screen reader testing, CI gate), CI gate guide includes full GitHub Action YAML with "Last reviewed 26 September 2026" — [guides](https://personaudit.com/guides), [CI guide](https://personaudit.com/guides/ci-accessibility-gate)
- /accessibility statement: targets WCAG 2.2 AA, scans every public page in light and dark on each change, build fails on violation; admits signed-in app areas "are not yet in the automated public scan" — [accessibility](https://personaudit.com/accessibility)
- /grade: letter grade A-F from axe-core WCAG 2.2 A/AA, up to 10 same-site public pages, best-practice issues never lower the letter, explicit "What this scan doesn't see" — [grade](https://personaudit.com/grade)

### Inferences
- Value prop in 5 seconds: the H1 is clear for the free grade ("grade your client's website") but the differentiated value (behind-login CLI + CI baseline) sits below the fold. The OG image and `<title>`/description lead with behind-login, while the H1 leads with the public grade. Two different top messages.
- Positioning is more candid than most competitors: it names the one thing it cannot do. That earns trust but also states on the paid-plan page that the $199 tier "funds" an unbuilt feature.

### Gaps
- Not verified: the hero form's behavior with real results, `/grade/[token]` live result, claim flow, badge output.

## 3. Evaluation

### Takeaway
Proof is the strongest and most distinctive element (real probes of public demo apps, null result shown, links to experiments). Conversion path is clear but has friction (Turnstile, card-up-front trial). Technical quality is high: Lighthouse accessibility, best-practices and SEO all 100; performance is the weak category.

### Cited Findings
- Lighthouse 12 CLI, mobile, default throttling, 2026-10-10. Home: Performance 0.67, Accessibility 1.00, Best Practices 1.00, SEO 1.00; FCP 3.3 s, LCP 9.8 s, TBT 90 ms, CLS 0.004, SI 3.9 s; unused JS 159 KiB. /grade: Performance 0.77, A11y/BP/SEO 1.00; FCP 2.1 s, LCP 4.9 s, TBT 200 ms, CLS 0; unused JS 165 KiB. LCP element on both is a text paragraph; 93% (home) and 87% (grade) of LCP time is element render delay, TTFB about 640 ms.
- Single-run lab numbers on a throttled emulation; no field data (CrUX) was consulted. The 9.8 s home LCP is a real finding but the exact cause (font swap, reveal animation, or hydration blocking paint) was not isolated.
- Positioning-rule compliance: copy explicitly states no disability simulation (llms.txt, home, pricing FAQ, for-agencies, accessibility, docs), personas "never" decide accessibility (pricing FAQ), behind-login CLI-only with "Hosted behind-login scanning is not built yet" repeated on /pricing, /for-agencies, /grade, sample report — see pages above. functional-review CLAIM-001 already corrected the sample-report upgrade prompt.
- Deadline claims on home: "Jun 28, 2025 EU accessibility enforcement began", "Apr 26, 2027 ... Title II" with "Not legal advice" — [home](https://personaudit.com/)
- Persona proof: validation experiments exist in repo but only the net-new-violations probe is linked from the site; personas-vs-crawler and task-success-validity are not surfaced — web home links only `experiments/net-new-violations` (GitHub); /Volumes/LizsDisk/multipersonas/experiments/
- Internal linking: footer carries all guides on every page; CI guide links to docs, WCAG checklist, agency plans. Guide content topics are generic (WCAG checklist, common issues, screen reader testing), the type of content larger competitors outrank.
- No customer counts, logos or testimonials anywhere; for-agencies code comment states it deliberately has no invented customer data — web/src/app/for-agencies/page.tsx:48.

### Inferences
- A 9.8 s LCP on mobile lab undermines the "accessibility tool" credibility and likely costs conversions on the primary page; fix is probably cheap (text paint delay, not a heavy image).
- "Case PA-0426" file-number branding repeats across pages; distinctive, but the first-time visitor may read it as noise.
- Honesty is a differentiator against overlay vendors but the lack of any human or customer proof means the only credibility source is the author's own probes.

### Gaps
- Did not test keyboard/screen reader behavior manually; Lighthouse a11y 100 is automated only. Local functional-review did include keyboard and print tests for public pages (coverage.md).
- Did not verify Core Web Vitals field data or Search Console indexing.

## 4. Positioning-rule compliance (every page)

### Takeaway
No hard violation found. Two soft risks.

### Cited Findings
- Compliant (explicit disclaimers): home, pricing, for-agencies, grade, sample report, docs, accessibility, llms.txt — see pages above.
- Soft risk A: sample-report headline "The report says what broke. This shows who it stopped." sits above the persona replay with steps labeled "calm / struggling / blocked" next to checkout-error states — web/src/app/sample-report/page.tsx:175. It reads as personas demonstrating the impact of the a11y defects, which sits close to "personas finding a11y friction", even though the widget is labeled "Opinion · AI". The home page uses the same widget.
- Soft risk B: "Roadmap" label for hosted behind-login on every paid plan and the sentence "Hosted behind-login scanning is not built yet. It is what this funds." — [pricing](https://personaudit.com/pricing), [for-agencies](https://personaudit.com/for-agencies). Not a claim that it exists, but it sells a $199/mo plan partly as funding for a feature and may read as a pre-order of a roadmap item.
- Home hero OG/meta description starts "The free CLI scans behind a login locally" and the H1 does not mention behind-login; the combined messaging is correct (CLI-only) but a skimmer could assume the hosted product does it. Mitigated by "Use the CLI for logged-in flows" under the form and the Limits section on /grade.
- Pricing capability ledger shows "Behind-login axe-core scan: Included" for all three plans with the note "CLI only" — [pricing](https://personaudit.com/pricing). Technically accurate; checkmarks next to a paid-plan column could imply a paid hosted feature.

### Inferences
- Soft risk A is the one to fix first; a reviewer applying the "personas never found a11y defects better than a crawler" rule could flag "who it stopped".

### Gaps
- Did not read every guide body for the rule words (grep of repo for disability terms shows hits in guides, grade-arrival, report-issue-copy; hits were not individually reviewed for context).

## 5. Missing things a buyer expects

### Takeaway
Missing: security/trust page, changelog, status page, about/founder page, testimonials/case studies, comparison pages, integrations page, API docs, VPAT/ACR, hosted-app docs.

### Cited Findings
- /security, /changelog, /status, /about all return 404 — curl 2026-10-10.
- /health API exists (web/src/app/api/health/route.ts) but is not a public status page; functional-review notes health false-green was fixed.
- No Stripe/Sentry/PostHog/Supabase subprocessor list visible in the pages fetched; /privacy and /terms exist (not read in full).
- Comparison content exists only as pricing-page text and FAQ vs Pope Tech, Silktide, WAVE, Lighthouse CI, pa11y-ci; no dedicated pages — [pricing](https://personaudit.com/pricing).
- Integrations mentioned in features (GitHub, Jira, Linear issue body; GitHub Action) but no integrations page; GitHub Action lives in repo only (`examples/github-actions/accessibility-gate.yml`), not a marketplace action.
- Docs: one page; no flag reference for `run`/`generate`, no report format spec, no hosted-app docs (projects, schedules, retest, white-label), no REST API docs. Public npm package `personaudit@0.1.0` (per CLAUDE.md, verified 2026-09-26).
- Founder credit exists in footer (GitHub link) but no about page, photo or story.
- Deployed analytics/Sentry/PostHog present per functional-review but no cookie banner assessment was done.

### Inferences
- A buyer comparing against Pope Tech / Deque / Level Access will look for a VPAT/ACR, security page and sample contract; none exists.

### Gaps
- Did not read /privacy and /terms bodies, so subprocessor and data-retention claims are unchecked.

## 6. Prioritized issue list

- P0: none. No broken page, no rule violation found, Lighthouse a11y/SEO/best-practices all 100.
- P1: Home mobile LCP 9.8 s (render delay 93%) and /grade 4.9 s; fix text paint delay (Lighthouse, this report section 3).
- P1: No security/trust page (404) for a tool asking agencies to run it against client sites and upload evidence.
- P1: No customer proof or testimonial; only self-run probes. Surface experiments (personas-vs-crawler, task-success-validity) as a methodology/evidence page.
- P2: Sample-report line "This shows who it stopped" (sample-report/page.tsx:175) is a positioning soft risk; reword to task-success language.
- P2: $199 plan copy "funds an unbuilt feature" and "Roadmap" on all plans; decide framing deliberately (functional-review also flagged demand unknown).
- P2: No changelog / status / about / integrations / comparison pages; GitHub Action only in repo.
- P2: Docs single page; no hosted-app or API docs; public APIs (grade, badge) undocumented.
- P2: Home H1 leads with public grade while meta/OG lead with behind-login; unify or deliberately split.
- P3: One generic OG image for all marketing pages; guides have generic topics unlikely to rank against larger vendors; no BreadcrumbList/Article schema seen; ~160 KiB unused JS; free-trial "card up front" friction.
- P3: Sample report excerpts 2 of 3 critical findings ("1 additional ... not excerpted").

## Quick wins
1. Reword sample-report/home persona caption to task-success language and remove "who it stopped".
2. Diagnose home LCP (likely font or entrance animation delaying paragraph paint) and remove the delay.
3. Publish a /security page (data handling, session never uploaded, SSRF guard, egress proxy) from existing docs/ssrf-egress-hardening.md and CONTEXT.md facts.
4. Add a /method or /evidence page linking all three experiments with the null result on applitools and the personas-vs-crawler outcome.
5. Show all 3 criticals in the sample report; per-page OG images for pricing and guides.
6. Add a changelog page fed from merged PRs (commit log already has clear fix/feat history).
