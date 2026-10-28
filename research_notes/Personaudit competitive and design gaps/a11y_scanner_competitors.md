# Automated web-accessibility scanning/monitoring competitors to Personaudit (as of 2026-10-10)

Method note: ~21 tool calls (vendor pages via WebFetch, aggregator/news via WebSearch). Several vendor pages returned no prices or 404s; those are listed under Gaps. Third-party aggregator prices are marked "unverified". Reddit/HN threads were NOT retrieved (no hits in searches run).

## 1. Feature matrix and what competitors offer that Personaudit lacks or does worse

### Takeaway
Personaudit's own site already claims: free no-account grade (up to 10 same-site public pages), per-finding status workflow (open/assigned/fixed/accepted risk/false positive), GitHub/Jira/Linear issue text export, retest comparison (new/cleared/still-open), CSV + printable report, agency-branded reports on agency plans, CLI login-session scanning, baseline CI gate, and a labeled AI persona layer. Gaps vs. competitors are mainly: multi-site/group dashboards with roles, native (not copy-paste) tracker/CI integrations, guided manual testing, VPAT/ACR and accessibility-statement outputs, PDF/document scanning, hosted behind-login scanning, a WordPress/CMS-inline checker, and published agency/reseller terms.

### Cited Findings
- Personaudit self-description: first grade free with no account; grade lists up to 10 same-site public pages; findings labeled with axe rule names; WCAG 2.2 A/AA; Solo $39/mo; CLI free MIT; agency plans exist but prices not listed; persona layer Solo and up, labeled AI opinion; points to a separate service (Fable) for testing with people with disabilities — [personaudit.com](https://personaudit.com/)
- Personaudit claims issue export is "one-click issue text" for GitHub, Jira, Linear (text export, not described as a live sync) — [personaudit.com](https://personaudit.com/)
- **Pope Tech** (closest agency/SMB competitor, built on WAVE engine): Free ($0; 1-25 pages sampled monthly, 2 users, 1 site); Team from $25/mo annual ($30 monthly), 50-500 page tiers, unlimited users/sites/groups, multi-website dashboard, group hierarchies, group scans/reports; Business Plus from $225/mo annual ($270 monthly) adds manual testing tracking, AIM-score guided manual testing, scanning behind login, developer API, templates/regions, bulk uploads, SSO, Jira/Asana/email ticketing, GitHub + Bitbucket CI/CD, YouTube caption detection, PDF scanning add-on (beta); Professional from $400/mo adds training, scheduled manual tests, help desk; Resellers/Agencies = contact sales. All paid tiers: unlimited rescans; pages count while active. — [pope.tech/pricing](https://pope.tech/pricing)
- Pope Tech's scheduling is cited by a university guide as one of its most impactful features; group-based access lets editors see only feedback for their part of a site; it is accessibility-only (no broken links/spelling) per Univ. of Minnesota — [USU](https://www.usu.edu/accessibility/websites/popetech-getting-started), [UMN](https://it.umn.edu/services-technologies/pope-tech), [search summary](https://blog.pope.tech/tag/schedule/)
- **WAVE API (WebAIM)**: 100 free credits on signup; 1 credit per basic page analysis (2-3 for advanced); $0.04/credit at 250-999 credits ($10 min), $0.03 at 1,000-9,999, $0.025 at 10,000+; JSON/XML, after CSS/JS applied; stand-alone installable API exists, no price listed — [wave.webaim.org/api](https://wave.webaim.org/api/)
- **Deque axe family**: axe DevTools Pro has Intelligent Guided Tests, Jira integration, "AI-enhanced features"; Free tier = basic automated testing only; CI/CD in Bundle; no prices published (sales/demo; free Pro trial, no card). axe Monitor page lists Jira integration, custom reports, trend analytics, site + PDF scanning, unlimited seats, "zero false positives" claim; page did not mention scheduling, auth scanning or WCAG 2.2 — [Deque pricing](https://www.deque.com/axe/devtools/pricing/), [axe Monitor](https://www.deque.com/axe/monitor/)
- Deque's study of 2,000+ audits: automated testing accounted for 57.38% of total issues by volume (axe-core, HTML pages only; Deque has a commercial interest); the common "30-40%" figure uses a success-criteria counting method Deque disputes — [Deque coverage](https://www.deque.com/automated-accessibility-testing-coverage/), [search summary](https://www.microassist.com/digital-accessibility/accessible-overlay-tools-realities-and-myths/)
- **Silktide**: no public tiers; sales/demo; min 12-month contracts typical; default scans every 5 days plus unlimited ad hoc; optional CMS integration retests on content change; PDF scanning; manual audit services; states it offers no overlay and no auto-fix; free no-signup accessibility checker, contrast checker as lead magnets; no white-label mention — [silktide.com/pricing](https://silktide.com/pricing/)
- **Accessibility Checker (Equalize Digital, WordPress plugin)**: Personal $0 (1 site, posts/pages); Professional $190/yr (1 site, full-site scan incl. CPTs, WooCommerce, password-protected sites); Small Business $750/yr or $75/mo (5 sites); Agency $2,250/yr or $225/mo (25 sites, Multisite add-on); unlimited scans, no per-page fees; Audit History + CSV export add-ons on SB/Agency; Agency Partner status; no Jira integration mentioned — [equalizedigital.com pricing](https://equalizedigital.com/accessibility-checker/pricing/)
- **Stark**: authenticated-URL scanning (public and private URLs behind login, default WCAG 2.2 AA) for Business/Enterprise, announced 2024-03-19; Oct 2024 added a free Starter plan (Figma, code repos, public URLs); Grow/Scale add private URLs, CI/CD, ticketing; Scale adds unlimited viewers + 365-day data; no dollar prices on page; one-click bug creation to ticketing — [Stark auth scanning](https://www.getstark.co/blog/authenticated-url-scanning), [Stark starter plan](https://www.getstark.co/blog/introducing-the-next-generation-stark-platform-and-free-starter-plan-for-teams/)
- **Siteimprove / Level Access / TPGi ARC**: pricing unpublished; aggregator claims (UNVERIFIED): Siteimprove mid-size spend ~$30k/yr; TPGi ARC $29/user/mo, enterprise $59/user/mo, free tier with monthly domain monitoring and user-flow monitoring (one user); Level Access custom. G2 reviewers of Siteimprove cite cost for small orgs, steep learning curve, config time, cannot ignore an issue to improve score; 4.6 rating over 432 G2 reviews — [WebAbility roundup](https://www.webability.io/blog/web-accessibility-testing-tools), [SourceForge ARC](https://sourceforge.net/software/product/TPGi-ARC-Platform/), [G2 compare](https://www.g2.com/compare/level-access-accessibility-platform-vs-siteimprove), [SaaSworthy](https://www.saasworthy.com/product/siteimprove/reviews)
- **BrowserStack Accessibility**: secondhand only: free scanner tier, paid from ~$199/mo (UNVERIFIED); Website Scanner with scheduled sitemap monitoring; Workflow Analyzer scans multi-step journeys (sign-up/checkout), CI/CD integration; official pricing URL 404'd — [BrowserStack](https://www.browserstack.com/accessibility-testing/compliance/wcag-ada-testing-tools), [Vertice](https://www.vertice.one/vendors/browserstack)
- **Evinced**: BrowserStack guide (undated, UNVERIFIED) lists $199/mo Test & Monitor, $459/mo Automate & Monitor; iTechGuides says on request + 14-day trial — [BrowserStack guide](https://www.browserstack.com/guide/evinced-alternatives), [iTechGuides](https://www.itechguides.com/best/website-accessibility-tools/)
- **AudioEye**: three tiers, no prices on page: Basic Protection (automated, ~50% of issues, monitoring, help desk), Self-Serviced (dev tools, scanner, expert audit, MCP), Maximum/Managed (custom-written fixes, Agentic Audits, Assurance); add-ons: VPAT, document remediation, legal response — [audioeye.com/plans-pricing](https://www.audioeye.com/plans-pricing/)
- **Equally AI**: Essential $38/mo (100K page views), Growth $115/mo (1M), Ultimate custom; includes WCAG/ADA/EAA remediation, manual validation, "certified attorney accessibility statement"; white label + multiple subdomains + compliance dashboard only on Ultimate; claims compliance for WCAG 2.1/2.2 AA, Section 508, ADA, AODA, EAA; markets a "$10k pledge" and a possible US tax credit — [equally.ai/pricing](https://www.equally.ai/pricing)
- **accessiBe / UserWay** (aggregator, conflicting): accessiBe Basic $49/mo (Capterra); another source: accessWidget $490-$3,990/yr by traffic, accessFlow (dev-side, by page count) demo-only. UserWay: Capterra $69/$169/$359 monthly; PricingSaaS lists different tiers ($49-$249), 15 plans. Vendor pages not fetched — [Capterra accessiBe](https://www.capterra.com/p/212877/accessiBe/pricing/), [Capterra UserWay](https://www.capterra.com/p/218549/UserWay/pricing/), [Checkthat](https://checkthat.ai/brands/accessibe/pricing), [PricingSaaS](https://pricingsaas.com/companies/userway)
- Lighthouse, Sitebulb, DubBot, Monsido, Allyant, RAMP: no usable data retrieved (DubBot pricing URL 404; Sitebulb search returned nothing).

### Inferences
- Pope Tech is the direct price/feature comparator: its $25-30/mo Team tier already has multi-site dashboard + group reports, while Personaudit's Solo is $39 with persona layer. Its Business Plus ($225-270/mo) is where login scanning, API, Jira, GitHub/Bitbucket CI sit. Personaudit's $199 agency tier undercuts Business Plus and already has CLI login scanning and CI gate in free OSS form, which is a real differentiator, but only if the hosted agency tier offers equivalent group/dashboard features.
- Equalize Digital's Agency at $225/mo for 25 sites is the benchmark for "agency price per site" ($9/site/mo); WordPress-native inline checking is a channel Personaudit doesn't cover.
- Most enterprise vendors (Deque, Siteimprove, Level Access, Silktide, TPGi) hide prices; published self-serve pricing is itself a differentiator for the $50-300 gap.

### Gaps
- No official pricing for Siteimprove, Level Access, TPGi, BrowserStack, Evinced, Monsido, DubBot, Sitebulb, Allyant, RAMP; Personaudit agency tier price/feature list not on the fetched page.
- No verification of which competitors generate VPAT/ACR in-product (AudioEye lists VPAT as an add-on service; Level Access/Allyant/TPGi likely do via services, unverified) or ship EN 301 549 mapping.
- Per-vendor AI fix suggestions (Deque "AI-enhanced", AudioEye "Agentic Audits"/MCP) are named but not detailed.

## 2. Pricing tiers, gating, and free lead magnets

### Takeaway
SMB/agency scanners price by pages or sites (Pope Tech $25-$400+/mo, Equalize Digital $190-$2,250/yr, Equally $38-$115/mo by page views); enterprise tools are quote-only. Gating pattern: multi-site/group views at mid tier; login scanning, API, ticketing and CI at upper-mid tier; training/consulting at top.

### Cited Findings
- Pope Tech gates login scanning, API, Jira/Asana, GitHub/Bitbucket CI, SSO at Business Plus ($225+/mo) — [pope.tech/pricing](https://pope.tech/pricing)
- Stark gates private-URL scanning, CI/CD, ticketing to Grow+ (earlier Business) — [Stark](https://www.getstark.co/blog/introducing-the-next-generation-stark-platform-and-free-starter-plan-for-teams/)
- Free lead magnets: Pope Tech Free plan (1-25 pages); WAVE API 100 free credits; Silktide free checker/contrast tool without sign-up; TPGi ARC free tier and free ARC Toolkit; Equalize Digital free Personal plugin; BrowserStack free scanner tier (secondhand); Stark free Starter — sources above
- Contract terms: Silktide 12-month minimum; Equalize Digital offers monthly or annual; Pope Tech annual discount (~17%) — sources above

### Inferences
- Personaudit's "first grade free, no account" is a stronger low-friction magnet than Pope Tech (account needed) or Stark; its weakness is the 10-page cap versus Pope Tech's 25-page free sample.

### Gaps
- Final Personaudit agency price/limits not verified beyond the user brief ($199 founding).

## 3. Onboarding speed and signup friction

### Takeaway
Only a few competitors offer result-before-signup: Personaudit (free grade, no account), Silktide (free checker), WAVE (browser extension/web tool). Enterprise vendors require demo calls.

### Cited Findings
- Personaudit: no account for first grade — [personaudit.com](https://personaudit.com/)
- Deque Pro: free trial without credit card; axe Monitor, Silktide, Level Access, Siteimprove: demo/sales — [Deque](https://www.deque.com/axe/devtools/pricing/), [Silktide](https://silktide.com/pricing/)
- Pope Tech onboarding at universities goes through a group manager — [UMN](https://it.umn.edu/services-technologies/pope-tech)
- BrowserStack Workflow Analyzer setup "requires initial effort" per one reviewer (secondhand) — [BrowserStack](https://www.browserstack.com/accessibility-testing/compliance/wcag-ada-testing-tools)

### Gaps
- No measured time-to-first-result for any vendor.

## 4. User praise and complaints

### Takeaway
Praise: scheduled scans/emailed reports, non-specialist-friendly grouping, support. Complaints: cost and learning curve for enterprise tools; no ability to ignore/accept an issue to fix score; scanners miss manual-only barriers; overlays misrepresent compliance.

### Cited Findings
- Siteimprove G2: 4.6/432 reviews; praise support/ease of use; complaints cost for small orgs, steep learning curve, config time, some scan accuracy/slow loading, cannot ignore an issue to raise score — [SaaSworthy](https://www.saasworthy.com/product/siteimprove/reviews), [G2](https://g2.com/products/siteimprove/reviews?page=3)
- Pope Tech: scheduling + group access praised in university guides; limitation: automated only, accessibility-only — [USU](https://www.usu.edu/accessibility/websites/popetech-getting-started), [UMN](https://it.umn.edu/services-technologies/pope-tech)
- BrowserStack paid plans "may be costly for smaller teams" (secondhand) — [BrowserStack roundup](https://www.browserstack.com/accessibility-testing/compliance/wcag-ada-testing-tools)
- FTC v. accessiBe: announced 2025-01-03, $1M settlement, final consent order approved 2025-04-22; bans claims that accessWidget makes any site WCAG-compliant; requires disclosure of undisclosed paid-review connections. Order targets marketing claims, not overlay tech generally; "20 years" duration seen in one vendor blog only (unverified) — [TechCrunch](https://techcrunch.com/2025/01/03/ftc-orders-ai-accessibility-startup-accessibe-to-pay-1m-for-misleading-advertising), [Hudson Cook](https://www.hudsoncook.com/article/ftc-targets-accessibility-overlays/), [SBLTN](https://sbltn.substack.com/p/052)
- Overlay lawsuit counts (e.g. "800+ businesses with accessiBe still sued") come from a competitor blog (TestParty), treat as unverified — [TestParty](https://testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued)

### Inferences
- Honest positioning is already differentiated: Personaudit says automated checks find only part of the issues, deterministic axe findings, and points to human testing. Silktide uses the same "no overlay, no auto-fix" line. Equally AI and AudioEye (managed tier) still market "compliance"/"pledge" outcomes: contrast, not to copy.
- Persona AI being labeled opinion and never simulating disabled users contrasts with vendors selling "AI compliance"; competitors doing AI persona/disabled-user simulation were not found in this research (not searched specifically).

### Gaps
- No Reddit r/accessibility, r/webdev, r/agency or Hacker News threads retrieved; no Capterra review text for Pope Tech/WAVE/Equalize; no axe Monitor review data.

## 5. Table stakes vs differentiators for agencies

### Takeaway
Inferred from the above: table stakes = scheduled scans with email, multi-site dashboard, issue status/ignore workflow, CSV/PDF export, WCAG 2.2, ticket export. Differentiators = behind-login hosted scanning, native Jira/GitHub integrations with PR status, white-label client reports, guided manual testing, VPAT/ACR, accessibility statement generator, reseller terms.

### Cited Findings
- Multi-site dashboard and group reports at $25-30/mo (Pope Tech Team) — [pope.tech/pricing](https://pope.tech/pricing)
- Agency plan with multisite network reports at 25 sites (Equalize Digital) — [equalizedigital.com](https://equalizedigital.com/accessibility-checker/pricing/)
- White label gated to custom tier at Equally — [equally.ai](https://www.equally.ai/pricing)
- Reseller programs: Pope Tech "contact sales", AudioEye partner page (no terms) — sources above

### Inferences
- Agencies need per-client separation and branded handoff more than raw scan depth; Personaudit's component-level defect merging ("one broken component = one defect") reduces ticket counts, which none of the fetched competitor pages claim. Treat as a genuine differentiator but unverified competitively (no vendor docs on dedupe were read).

### Gaps
- Not verified whether Pope Tech/Siteimprove dedupe repeated template defects.

---

## Prioritized list: Personaudit is missing / should add / should improve

1. **Multi-site / client workspace dashboard with roles and per-client viewer access** (Pope Tech Team from $25/mo; Equalize Digital Multisite; Stark viewers). Table stakes for agencies; if absent in the hosted app, it is the biggest gap.
2. **Hosted behind-login scanning** (Pope Tech Business Plus; Stark Business; BrowserStack Workflow Analyzer; TPGi user-flow monitoring). Personaudit has CLI-only; agencies with portals/stores want scheduled auth scans. Must not be marketed until shipped (per repo CLAUDE.md).
3. **Live issue-tracker sync (Jira, Linear, GitHub Issues) and PR status/comments** (Pope Tech Jira/Asana; Deque Jira; Stark one-click bug). Personaudit's export is text; make it create/link issues and update status on retest.
4. **Published agency/reseller terms and white-label client portal** (Pope Tech reseller, Equalize Agency Partner, Equally white label). Personaudit already puts the agency name on reports; add custom domain/logo client share link and public pricing for agency tier.
5. **Guided manual-testing checklists tied to findings** (Pope Tech AIM score + manual tracking; Deque IGT). Directly supports Personaudit's honest "automation finds only part" message and fills the gap automation leaves; also gives agencies a defensible audit trail.
6. **Accessibility statement generator + VPAT/ACR draft export** (Equally attorney-reviewed statement; AudioEye VPAT add-on). Strong for ADA/EAA pressure; label as draft needing human review to stay consistent with positioning.
7. **EN 301 549 / EAA mapping on findings** (Equally claims EAA; not verified elsewhere). Cheap metadata layer on axe rules; relevant to EU clients.
8. **Scheduled-scan frequency, trend history and score over time** (Pope Tech, Silktide 5-day default, Deque trend reports). Personaudit has scheduled emails and retest diff; add trend chart and sitemap-wide crawl depth beyond 10 pages on paid tiers.
9. **Accepted-risk / ignore handling that does not wreck the score** (Siteimprove complaint). Personaudit already has accepted-risk/false-positive status; make sure score treatment is explicit and auditable.
10. **PDF/document scanning** (Silktide, Deque axe Monitor, Pope Tech add-on beta). Lower priority; EAA/ADA exposure on PDFs is real but a different engine.
11. **WordPress/Craft inline checker or plugin hook** (Equalize Digital free plugin as lead magnet; Silktide CMS retest). Matches Rocketpark-style agencies; consider a GitHub Action + Craft/WordPress deploy-hook recipe rather than a plugin.
12. **Keep and sharpen (do not copy)**: baseline-gate CI that fails only on new defects, free no-account grade, deterministic axe-only claims, published price. Contrast positioning: accessiBe FTC order, Equally "$10k pledge"/"compliance" language, AudioEye managed "Maximum Protection". Personaudit should keep avoiding compliance guarantees and never position personas as better at finding defects than a crawler.
