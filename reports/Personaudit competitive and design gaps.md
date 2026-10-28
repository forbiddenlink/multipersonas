# Ship Trust Artifacts Before More Features

Personaudit's scanner and CI gate are already competitive, so its biggest gaps are the artifacts a skeptical agency buyer expects around them: a security page, a real PDF deliverable, a pull-request comment, a methodology page, and proof from someone other than the author. Competitors win agencies with branded deliverables and workflow (Pope Tech's multi-site dashboard starts at **$25/mo**, and its login scanning, API, Jira and CI sit at **$225/mo+**), not with better detection ([Pope Tech pricing](https://pope.tech/pricing)). Practitioners say the same thing: a tool that "only scans and reports" is a nice-to-have, and a white-label report that helps an agency upsell fixes is "the stronger angle" ([r/SaaS thread](https://reddit.com/r/SaaS/comments/1rm9x0i/verifying_a_bfsgeaa_accessibility_compliance_tool/o8ybz8s/)). The persona layer is correctly scoped to task success, and the best-supported outside evidence (NN/g, Loop11, Baymard) says the way to keep it credible is to publish validation data and separate "the site blocked the agent" from "the agent failed" ([NN/g](https://www.nngroup.com/articles/synthetic-users/), [Loop11](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/)). The site itself is already past most AI tells; the design work is to ration the repeated "exhibit" scaffold, make the sample report a real paper document that stays paper in dark mode, and design the /grade result as the shareable cover sheet. Four small fixes should land first because each is cheap and each is a credibility leak today: home mobile LCP of **9.8 s**, the sample-report line "This shows who it stopped" (`web/src/app/sample-report/page.tsx:175`), the CSP `'unsafe-inline'` on `script-src` (`web/next.config.ts:23`), and the 404 on `/security`. The ranked lists below carry 43 items with effort in hours or days, evidence, and tier; the ones marked (G) are flagged because a careless version would violate the positioning rules.

Written against: `fbabf8c` (main), research snapshot 2026-10-10. Effort figures are my estimates for one developer who knows the repo, not measurements. Treat the report as a frozen destination: if HEAD has moved, re-check file references before acting.

## Strong core, thin trust layer

The live site is small, coherent and unusually candid: 15 sitemap URLs, five guides, a CLI docs page, a ruled pricing ledger, a sample report and a full signed-in app. Lighthouse (12, mobile, single run) scored Accessibility, Best Practices and SEO at **1.00** on both home and /grade, with performance the weak category at **0.67** on home (LCP 9.8 s, 93 percent of it element render delay) and **0.77** on /grade (LCP 4.9 s). `/security`, `/changelog`, `/status` and `/about` all return 404, there are no customer logos or testimonials, and the only proof is the author's own probes of public demo apps. That proof is distinctive (a real probe table including a null result on applitools), but it is the sole credibility source, and the two stronger experiments (`personas-vs-crawler`, `task-success-validity`) are not linked from the site. The product is also deeper than the marketing shows: scheduling, retest compare, projects, the badge API and the claim flow are undocumented, and the public `grade` and `badge` APIs have no docs.

Two soft positioning risks were found, neither a hard violation. The sample-report caption "The report says what broke. This shows who it stopped." sits above a persona replay with "calm / struggling / blocked" steps, which reads close to personas demonstrating accessibility harm; I confirmed the string at `web/src/app/sample-report/page.tsx:175`. And the pricing ledger shows "Behind-login axe-core scan: Included" for all three plans (note: CLI only) next to a $199 tier whose copy says hosted behind-login scanning "is what this funds", which can read as a pre-order of an unbuilt feature. The FTC's accessiBe order is the reference case for what an unsubstantiated claim costs: **$1M**, final order April 22, 2025, for claiming a widget made any site WCAG compliant ([TechCrunch](https://techcrunch.com/2025/01/03/ftc-orders-ai-accessibility-startup-accessibe-to-pay-1m-for-misleading-advertising)).

One design observation from the first research pass was corrected by the second. The first pass captured only dark renders and called the sample report "a dark card". The gap-fill pass showed the site follows the OS setting (dark when `prefers-color-scheme: dark`, light otherwise, with a header toggle), and that the light theme is the stronger expression of the concept. Developers, who are the CLI audience, often run dark OS themes, so the dark first impression is the one that most needs the paper concept to survive.

## Competitors sell deliverables and workflow, not detection

The scanner market splits cleanly. Self-serve tools price by pages or sites and gate in a consistent order: multi-site and group views at the low tier, login scanning, API, ticketing and CI at the upper-mid tier, training at the top. Pope Tech Team ($25-30/mo) already ships a multi-site dashboard with group reports; Business Plus ($225-270/mo) adds scanning behind login, API, Jira/Asana, GitHub and Bitbucket CI, and manual-test tracking ([Pope Tech](https://pope.tech/pricing)). Equalize Digital's Agency plan is **$2,250/yr or $225/mo for 25 sites**, about $9 per site ([Equalize Digital](https://equalizedigital.com/accessibility-checker/pricing/)). Smaller agency-priced white-label scanners cluster around Personaudit's $199 founding tier: Access Radar at EUR 199/mo for 25 client sites ([Capterra](https://www.capterra.com/p/10047163/Access-Radar/)), WCAGRepair at $199 for 50 domains (a vendor's own comparison, [WCAGRepair](https://wcagrepair.com/agency)), and ACE from $89/mo with white-label PDF ([GetApp](https://www.getapp.com/all-software/a/ace-1/)). Enterprise vendors (Deque, Siteimprove, Level Access, Silktide) hide prices, so published self-serve pricing is itself a differentiator in the $50-300 gap, and Personaudit's "first grade free, no account" is a stronger low-friction magnet than Pope Tech's account-gated free plan, though its 10-page cap is smaller than Pope Tech's 25-page free sample.

On the developer side, the closest threat is not a commercial vendor. `github/accessibility-scanner` (382 stars, MIT, pushed 2026-10-09) offers per-URL config, screenshots, grouped issue filing, auth via Playwright session state, and Copilot-assisted fix PRs, but its only suppression mechanism is a `wontfix` label and it needs a fine-grained PAT ([README](https://github.com/github/accessibility-scanner)). Pa11y CI ships a config file, sitemap ingestion with host rewrite, JSON reporting and per-page thresholds ([pa11y-ci](https://github.com/pa11y/pa11y-ci)). Personaudit's baseline gate (fail only on new defects, keyed by a stable id that collapses framework-generated element ids) is stronger than either, but `scan` writes only `scan.md` plus a baseline file, and the packaged action outputs `new-defects` and `report-path` with no PR comment (`src/cli.ts:155`, `action.yml`). No fetched README offered suppression with an expiry date, which makes that an open lead position rather than a catch-up item.

The persona category is crowded at the "URL in, replay and report out" level (Versive Snap, Mockingbird, SimUser, Loop11 agents), so replay and transcript are table stakes, not differentiators ([Versive](https://getversive.com/blog/introducing-snap), [Versive docs](https://docs.getversive.com/ai-tests/overview)). Validity evidence across the category is thin. Loop11's own comparison had agents completing **0-25 percent** of tasks on one prototype where humans completed 62-95 percent, with no sample sizes disclosed ([Loop11](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/)). NN/g treats synthetic-user output as hypotheses, not findings, and tells buyers to demand evaluation data ([NN/g](https://www.nngroup.com/articles/baymard-ai-tool-accuracy/)). Practitioners on r/UXResearch call it "research theatre" ([r/UXResearch](https://reddit.com/r/UXResearch/comments/1u7r7ur/automated_research_logistics/os35fxx/)). Show HN launches for AI usability testing mostly drew 1-3 points ([Behavr](https://news.ycombinator.com/item?id=47086059)). The implication is to lead launches with the scan and CI gate, keep personas secondary and labeled, and publish the validation. Baymard's published methodology and raw data are the credibility bar NN/g holds up ([Baymard](https://baymard.com/blog/ai-heuristic-evaluations)).

The legal pressure supports the agency wedge without justifying overclaims. Federal website accessibility suits reached **3,117 in 2025 (+27 percent)** ([Seyfarth](https://www.adatitleiii.com/2026/03/federal-court-website-accessibility-lawsuit-filings-bounce-back-in-2025/)), and total Title III filings hit **5,006 in H1 2026**, the highest midyear count since 2021 ([Seyfarth](https://www.adatitleiii.com/2026/09/2026-mid-year-report-ada-title-iii-federal-lawsuit-numbers-are-climbing/)). The DOJ moved Title II deadlines to April 26, 2027 (50,000+ population) and April 26, 2028 (smaller entities), without changing the WCAG 2.1 AA standard, and cited limits of automated remediation ([Seyfarth](https://www.adatitleiii.com/2026/04/doj-extends-ada-title-ii-website-accessibility-deadlines-for-governmental-entities-but-litigation-and-compliance-risks-remain/)). EAA enforcement is complaint-driven with no confirmed fines as of mid-2026, though a Caen court ordered Carrefour to make its site accessible and held 71 percent RGAA conformance "not sufficient" ([Level Access, a vendor](https://www.levelaccess.com/blog/eaa-compliance-in-2026-how-enforcement-has-evolved-and-what-to-expect-next/)). WebAIM's 2026 Million found **95.9 percent** of home pages with a detectable WCAG failure (secondary summary, [Priority Pixels](https://prioritypixels.co.uk/insights/web-accessibility-is-getting-worse-according-to-the-2026-webaim-million-report/)). Lead with ADA and use the EAA as the secondary hook; the EU microenterprise exemption shrinks that market for small clients.

## Four ranked lists

Ranking is by impact for the agency wedge (a web agency reselling monitoring and evidence to clients, plus a developer-side CI gate). Tier definitions: **now** is the next two weeks, **next** is two to eight weeks, **later** is after that. "Verify" means the research could not confirm the current repo state and the first task is to check. Items marked (G) are guardrail-sensitive and appear again in the positioning table.

### Missing: competitors or buyers expect it, Personaudit does not have it

| Rank | Item | Impact | Effort | Tier | Evidence |
|---|---|---|---|---|---|
| 1 | Real PDF report plus per-client share link, white-label, with an honest scope block (date, URL set, axe version, WCAG version, "automated only"). Site copy lists CSV and print export; no PDF was seen. Verify. | High | 3-4 days | now | [r/SaaS D1](https://reddit.com/r/SaaS/comments/1rm9x0i/verifying_a_bfsgeaa_accessibility_compliance_tool/o8ybz8s/); [Versive share links](https://getversive.com/blog/introducing-snap); [Access Radar](https://www.capterra.com/p/10047163/Access-Radar/); [WCAGRepair](https://wcagrepair.com/agency) |
| 2 | `/security` trust page: session never uploaded, SSRF guard, egress proxy, subprocessors, retention. Currently 404. Source material exists in `docs/ssrf-egress-hardening.md`. | High | 4-6 hours | now | curl 404 on 2026-10-10; buyer expectation per baseline; GOV.UK "tested, with notes" credibility pattern ([GOV.UK](https://design-system.service.gov.uk/get-started/)) |
| 3 | Sticky PR comment and annotations in the GitHub Action (new, fixed, still open). The action has outputs only. | High | 1-2 days | now | [github/accessibility-scanner](https://github.com/github/accessibility-scanner); [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci); `action.yml` |
| 4 | Multi-client roster with per-client viewer access (a client sees only their site). Projects exist; roles and viewer links unconfirmed. Verify. | High | 5-8 days | next | [Pope Tech Team](https://pope.tech/pricing); [Equalize Multisite](https://equalizedigital.com/accessibility-checker/pricing/); [Stark viewers](https://www.getstark.co/blog/introducing-the-next-generation-stark-platform-and-free-starter-plan-for-teams/) |
| 5 | Machine-readable reporters: JSON first, then SARIF (GitHub code scanning) and JUnit. Only `scan.md` today. | Medium | JSON 4 hours; SARIF 1 day | now (JSON), next (SARIF) | [pa11y-ci reporters](https://github.com/pa11y/pa11y-ci); `src/cli.ts:155` |
| 6 | Live issue creation in GitHub Issues, Jira, Linear (today: copy-ready text). Status updates on retest. | Medium | GitHub 2-3 days; Jira +3 days | next | [Pope Tech Jira](https://pope.tech/pricing); [Deque Jira](https://www.deque.com/axe/devtools/pricing/) |
| 7 | Config file, sitemap ingestion (with exclude and host rewrite for preview URLs), ignore rules. | Medium | 2-3 days | next | [pa11y-ci](https://github.com/pa11y/pa11y-ci); scanner `url_configs` |
| 8 | Step timeline, screenshots and Playwright trace for persona runs. Sample report has a replay widget; `run` artifacts unconfirmed. Verify. | Medium | 1-2 days | next | [Versive](https://getversive.com/blog/introducing-snap); [UXAgent](https://arxiv.org/abs/2504.09407) |
| 9 | Goal templates for persona tasks (checkout, signup, contact) and saved goals per client site. | Low-Med | 1-2 days | next | [Versive docs](https://docs.getversive.com/ai-tests/overview) |
| 10 | (G) Hosted, scheduled behind-login scanning. The largest feature gap and the one competitors gate at $225+/mo. Do not market until shipped. | High, long term | 2-4 weeks (credential storage dominates) | later | [Pope Tech Business Plus](https://pope.tech/pricing); [Stark authenticated scanning](https://www.getstark.co/blog/authenticated-url-scanning) |

### Should add: new capability where Personaudit can lead

| Rank | Item | Impact | Effort | Tier | Evidence |
|---|---|---|---|---|---|
| 1 | Suppression with reason, owner and expiry, keyed on the stable defect key; expired entries fail the gate. Accepted-risk state already exists in the app, so extend to CLI. | High | 2-3 days | now | No suppression-with-expiry found in Pa11y, IBM, scanner or Lighthouse CI READMEs ([scanner](https://github.com/github/accessibility-scanner)); ignore-log complaint ([WP.org review](https://wordpress.org/support/topic/helpful-but-ignore-log-keeps-resetting/)) |
| 2 | Per-criterion coverage table in every report: tested by axe, needs manual check, not evaluated; plus a slot where the agency records its own keyboard and screen reader pass. Score secondary. | High | 2-3 days | now | [accessibility.build sample report](https://accessibility.build/sample-audit-report); [Accessible.org on procurement](https://accessible.org/procurement-teams-check-acr/); Lighthouse score-gaming ([HN](https://news.ycombinator.com/item?id=39331626)) |
| 3 | Larger task-success validation (more than n=2, with a human baseline) and a blocked-result label that separates "site blocked the agent" from "agent limitation". | High | 3-5 days build; human baseline needs recruiting | next | [NN/g](https://www.nngroup.com/articles/synthetic-users/); [Loop11](https://www.loop11.com/ai-vs-human-usability-testing-a-comparative-analysis-using-loop11/); [Baymard](https://baymard.com/blog/ai-heuristic-evaluations) |
| 4 | MCP server: `scan_site`, `compare_to_baseline`, `get_defect`, `update_baseline` (confirmation-gated), localhost-aware, SSRF guard on, session by path only. Existing servers return the whole page's violations each time. | Medium | 3-5 days | next | [a11y-mcp](https://github.com/priyankark/a11y-mcp); [Deque axe MCP](https://github.com/dequelabs/axe-mcp-server-public) (paid, proprietary) |
| 5 | Element screenshot attached to each defect. | Medium | 1-2 days | next | scanner `include_screenshots`; pa11y `screenCapture` |
| 6 | Per-run artifact folder for `run` plus `--max-cost` cap. | Medium | 1-2 days | next | [UXAgent](https://github.com/neuhai/UXAgent); `src/agent/engine.ts` step caps |
| 7 | Partner program: 20 percent recurring for 12 months is inside the 10-30 percent market band. Requires clear affiliate disclosure. | Medium | 2-4 days plus terms | later | [accessiBe partners](https://accessibe.com/partners); [Equalize 10 percent](https://equalizedigital.com/affiliate-terms/); FTC order covers undisclosed paid reviews |
| 8 | EN 301 549 / EAA mapping metadata on findings (a mapping, never a conformance claim). | Low-Med | 1-2 days | later | [Equally](https://www.equally.ai/pricing) claims EAA; not verified elsewhere |
| 9 | Task-success regression gate for persona goals (`--fail-on` for goals). No persona competitor shows it. | Medium | 3-4 days | later | Persona-vs-QA gap in [Momentic vs QA Wolf](https://momentic.ai/comparison/momentic-vs-qa-wolf) context; no persona tool found with a CI gate |
| 10 | Success-only billing and free retry on agent infrastructure failures. | Low | 1-2 days | later | [Versive docs](https://docs.getversive.com/ai-tests/overview) |

### Should improve: exists, can be better

| Rank | Item | Impact | Effort | Tier | Evidence |
|---|---|---|---|---|---|
| 1 | Home mobile LCP 9.8 s and /grade 4.9 s. Cause is render delay on a text paragraph (font swap, reveal animation or hydration; not isolated). | High | 0.5-1 day | now | Lighthouse 12 CLI, 2026-10-10 |
| 2 | Sample report: reword the caption at `sample-report/page.tsx:175` to task-success language, show all three critical findings (two of three are excerpted), keep the sheet paper in dark mode, add running header and "Page X of N". | High | 1.5-2 days | now | Baseline section 4; [Stripe Press](https://press.stripe.com/) product-as-object; [accessibility.build](https://accessibility.build/sample-audit-report) |
| 3 | (G) Pricing and agency copy for the unbuilt hosted login feature: stop selling the $199 tier as funding it, and relabel the ledger row "Included (CLI only)". Owner decision. | High | 2-3 hours | now | Baseline section 4; FTC order |
| 4 | /grade result as a cover sheet: letter tile, key/value strip (site, scanned UTC, pages reached, engine), text-plus-icon outcomes, tabs for Findings / Pages / Method, retest timer, "how this grade is calculated" arithmetic. `grade-copy-link.tsx` and `grade-verdict-stamp.tsx` already exist; the result page itself was not seen by the research. Verify. | High | 3-4 days | now | [MDN Observatory](https://developer.mozilla.org/en-US/observatory/analyze?host=mozilla.org); [internet.nl](https://internet.nl/site/mozilla.org/); [PageSpeed Insights](https://pagespeed.web.dev/) |
| 5 | CSP: remove `'unsafe-inline'` from `script-src`. securityheaders.com capped the grade at A for it. The code comment at `next.config.ts:8` already plans nonce migration. | Medium-High | 1-2 days | now | securityheaders.com result for personaudit.com, 2026-10-10; `next.config.ts:23` |
| 6 | Ration the EXHIBIT scaffold: label evidence sections only, vary layouts so no three adjacent sections match, cut pricing from six exhibits to three. | Medium | 1-2 days | now | Design notes sections 1 and 7 |
| 7 | Monthly client digest: new, fixed, regressed since last scan, branded. Schedule emails and retest compare both exist, so this is assembly. | High | 2-3 days | next | [r/SaaS D1](https://reddit.com/r/SaaS/comments/1rm9x0i/verifying_a_bfsgeaa_accessibility_compliance_tool/o8ybz8s/); [Silktide 5-day default](https://silktide.com/pricing/) |
| 8 | Packaged action: stop building from source on every run (`pnpm install`, `pnpm build`, `playwright install`); use the published `personaudit` npm package or a prebuilt image and cache the browser. | Medium | 1 day | next | `action.yml`; benchmark `npx unlighthouse --site <url>` ([Unlighthouse](https://github.com/harlan-zw/unlighthouse)) |
| 9 | Docs: flag reference for `run` and `generate`, report format, hosted app (projects, schedules, retest, white label), and the public `grade` and `badge` APIs. | Medium | 2-3 days | next | Baseline section 5 |
| 10 | Shorten mobile: home 8,691 px, pricing 7,783 px, agencies 8,615 px. Collapse procedure and FAQ behind disclosure. | Medium | 1 day | next | Design gap-fill section 1 |
| 11 | Raise real labels from 8.5-11 px to at least 12 px; unify the H1 with the meta and OG lead; per-page OG images (home and pricing currently share one). | Low-Med | 0.5-1 day total | next | Design gap-fill; baseline section 2 |

### Should create: new pages, content and artifacts

| Rank | Item | Impact | Effort | Tier | Evidence |
|---|---|---|---|---|---|
| 1 | `/method`: link all three experiments, show the applitools null result and the personas-vs-crawler outcome, axe version, WCAG mapping, the 57-percent-by-volume caveat, and what personas do and do not claim. | High | 1 day | now | [Baymard](https://baymard.com/blog/ai-heuristic-evaluations); [NN/g](https://www.nngroup.com/articles/baymard-ai-tool-accuracy/); [Deque study](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) (vendor of its own tool) |
| 2 | Comparison pages: vs Pope Tech, vs github/accessibility-scanner, vs Pa11y CI, vs overlays. Dated, footnoted, sourced; lead with keyless new-defect gate, stable keys, honest coverage. | High | 0.5-1 day each | next | Alternatives pages by [Silktide](https://silktide.com/s/overlays-got-1416-sites-sued-in-2025/) and TestParty; pricing page already carries "as of Oct 2026" prices |
| 3 | (G) Agency liability-aware kit: scope clause ("automated monitoring, not a compliance guarantee"), client explainer, "what to do when a demand letter arrives". Counsel review required, labeled not legal advice. | High | 2 days plus review | next | Liability stays with the publisher ([r/accessibility](https://reddit.com/r/accessibility/comments/1m8vtjb/forced_to_do_satans_work/n538xe1/)); [Accessible.org](https://accessible.org/how-to-ethically-sell-accessibility-services-as-a-digital-agency/) |
| 4 | Dated lawsuit and deadline hub: Seyfarth counts, Title II dates, EAA tracker, WebAIM 2026. Stamp an "as of" date and re-verify yearly. | Medium-High | 1-2 days | next | [Seyfarth](https://www.adatitleiii.com/2026/09/2026-mid-year-report-ada-title-iii-federal-lawsuit-numbers-are-climbing/) |
| 5 | `/changelog` fed from merged PR history. | Medium | 0.5-1 day | now | Ledger style: [Agentcard](https://www.agentcard.sh/updates), [Daybridge](https://daybridge.com/changelog) |
| 6 | `/about` page with the founder story, one photo, how the probes were run. No invented customers. | Medium | 3-4 hours | now | Baseline section 5 (footer credit only) |
| 7 | Publish the site's own dated axe result on /accessibility (the accessibility statement already says it scans every public page in both themes). | Medium | 0.5 day | now | GOV.UK convention; [Deque](https://www.deque.com/) comparison |
| 8 | Retainer playbook guide: how to sell monitoring plus a delta report as a monthly service without promising compliance. Replace generic guide topics. | Medium | 1 day | next | [Accessible Web](https://accessibleweb.com/agencies/accessible-agency-selling-accessibility-to-current-clients/) (vendor); retainer ranges $1,000-2,000/mo for human-led services ([Digital A11y](https://www.digitala11y.com/pricing/)) |
| 9 | Integrations page, GitHub Marketplace action listing, Docker image (CLI plus Chromium). | Medium | 2-3 days | next | Baseline section 5; open-source note Q6 |
| 10 | Deploy-hook recipes (Craft, WordPress, Vercel, Netlify) as guides rather than plugins. | Medium | 1 day each | next | [Equalize's free plugin as lead magnet](https://equalizedigital.com/accessibility-checker/pricing/); Silktide CMS retest |
| 11 | (G) Accessibility statement draft and "VPAT-lite" export, always labeled automated-only with required manual-input fields. | Medium | 4-6 days | later | [Equally](https://www.equally.ai/pricing); [AudioEye VPAT add-on](https://www.audioeye.com/plans-pricing/); procurement ask ([r/ProtonMail D8](https://reddit.com/r/ProtonMail/comments/1tyo09h/another_ios_update_without_accessibility_fix/oq8285q/)) |
| 12 | `/status` page. A `/api/health` route exists; the worker liveness heartbeat is an open item in the local review, so a status page would be green-but-lying until that ships. | Low-Med | 0.5-1 day after heartbeat | later | functional-review `improvements.md` |

The "now" tier totals roughly 17-25 developer days across both lists, dominated by the PDF, the /grade cover sheet, suppression, the coverage table and the PR comment. If only five things ship, ship these in order: the four cheap leaks fixed (LCP, caption, CSP, `/security`), then the PDF with scope block, then the PR comment, then suppression with expiry, then the monthly digest.

## Positioning guardrails: where a recommendation would violate the rules

The hard rules are: personas are never pitched as finding accessibility defects better than a crawler; no disabled-user simulation; no surface claims hosted behind-login scanning until it ships; never "compliant". The table lists every recommendation above or in the source notes that has a violating version, and the safe version.

| Recommendation | How it would violate | Safe version |
|---|---|---|
| Hosted behind-login scanning (Missing 10) | Any marketing before it ships, including "Included" checkmarks in a paid column or "funds" language | Keep "Not built" in the ledger; announce only after shipping; relabel the CLI row "Included (CLI only)" |
| Pricing framing (Improve 3) | Selling $199 as funding an unbuilt feature reads as a pre-order and echoes overclaim risk | Sell what exists (white label, unlimited projects, schedules, retest); keep the roadmap in one dated line |
| Sample-report caption "who it stopped" | Personas appear to demonstrate accessibility harm | Task-success wording, retain the "Opinion · AI" badge |
| Letter grade on /grade (Improve 4) | An "A" can read as compliance, the same failure as Lighthouse 100 ([HN](https://news.ycombinator.com/item?id=39331626)) | Define A as "no axe-detectable WCAG A/AA violations on the pages reached", show "needs manual" and "not tested" counts beside it |
| VPAT-lite, statement generator, EN 301 549 mapping (Create 11, Add 8) | Any output a reader can quote as "conformant" | Label automated-only, mark untested criteria "not evaluated", never the word "compliant", require human sign-off fields |
| Liability kit (Create 3) | "Protects you from lawsuits" language | "Monitoring, not a guarantee", counsel-reviewed, not legal advice |
| Partner program (Add 7) | Undisclosed paid referrals, the second count in the FTC order | Disclosure line on every referral surface |
| Persona extras from competitors: "interview the agent", SUS, severity on opinion, NPS | Agent severity inflation and sycophancy; implies persona judgment about accessibility | Do not add severity to opinion; if "ask the agent why" ships, label it a transcript of the run, not a finding |
| Persona-vs-crawler comparisons on comparison pages | Pitching personas as better at finding accessibility defects | Compare only on deterministic axe findings; describe personas as task success |
| Screen reader automation lane (Guidepup) | Not a violation (it automates real screen readers), but heavy and easy to market as "tested with assistive tech" | Not recommended now; revisit after the coverage table exists |
| "Agentic traffic" angle (an AI agent failing checkout is a finding) | Slides toward persona accessibility claims | Frame strictly as task success for automated visitors |

## Design: Paper Ledger, light first

### Art direction

The recommended direction is **A, Paper Ledger**: the site as a bound audit ledger, light paper by default, dark as a "night desk" theme. It is a refinement, not a redesign, because the repo already has a canonical system. `web/DESIGN.md` ("Evidence Dossier", locked 2026-09-26, light-first) defines manila desk, near-white sheets, blue-black ink, redline annotator, highlighter and stamp, and the tokens in `web/src/app/globals.css:70-87` are already close to the notes' proposals (`--background oklch(0.967 0.013 86)`, `--foreground oklch(0.22 0.025 262)`, `--primary oklch(0.38 0.13 264)`, `--destructive oklch(0.5 0.19 28)`). Keep the tokens. The proposed values in the notes (paper `oklch(96.5% .012 92)`, ink `oklch(21% .02 265)`) differ by amounts no visitor would see, and changing them would violate the change-discipline rule without gain. Type stays Newsreader for display (weight 400-500, tracking -1 to -2 percent; Vercel's -6 percent suits a grotesk and would clog a serif), IBM Plex Sans for body, IBM Plex Mono for IDs, rule names and commands, with tabular numerals for counts. Newsreader is SIL OFL ([Production Type](https://www.productiontype.com/news/new_fonts_from_production_type_newsreader)).

Directions B (Terminal Exhibit, acid green on black) and C (Marked-Up Proof, lemon paper) are rejected. B is the documented "second wave" AI default and works only when the mono language is as deep as Oxide's identity ([Pentagram](https://www.pentagram.com/work/oxide/story)). C is the highest effort and the easiest to tip into twee. Borrow one thing from C: a redline correction mark used once per page. The influences to carry over: Oxide's boxed `FIG. 1` figure caption, Stripe Press's "the product is the object, not UI chrome" ([Stripe Press](https://press.stripe.com/)), GOV.UK's tested-and-documented credibility, and Gwern-style footnotes for WCAG citations ([Gwern](https://gwern.net)). Reject the PostHog and Sentry lane of mascots and humor; it conflicts with an audit voice.

### Page-by-page changes

**Home** (5,351 px desktop, 8,691 px mobile, four exhibits plus hero). Keep the hero case-file sheet and add a boxed `FIG. 1` caption (today it reads `CASE PA-0426 / SAUCEDEMO.COM`). Turn the procedure exhibit into a full-width mono terminal band with no tab scaffold, and turn the next exhibit into a single-column essay with a sidenote, so no three adjacent sections share a layout. On mobile, collapse the four CLI steps behind disclosure, targeting under 6,000 px. Fix the LCP first, since a 9.8 s paint undermines an accessibility tool's credibility. Unify the H1 ("Grade your client's website") with the title and OG lead (behind-login via CLI), or split them on purpose.

**/grade** (2,422 px desktop, short and good). Keep the form page. Design the result as a cover sheet using the grader pattern shared by Security Headers, MDN Observatory, internet.nl and PageSpeed Insights: a large letter tile set in Newsreader, a key/value strip (site, scanned UTC, pages reached such as 7/10, axe-core version), every outcome as text plus icon plus color, tabs for Findings, Pages, Method and Raw JSON (keyboard operable with correct ARIA), a permalink with timestamp and the existing copy-link button, a visible retest timer, and a "how this grade is calculated" disclosure showing the arithmetic. Add "since last grade" delta once a site has two grades. Avoid circular gauges as the primary encoding, a full-bleed green hero, and upsell inside the result ([Security Headers](https://securityheaders.com/?q=https%3A%2F%2Fpersonaudit.com&followRedirects=on), [MDN Observatory](https://developer.mozilla.org/en-US/observatory/analyze?host=mozilla.org), [internet.nl](https://internet.nl/site/mozilla.org/)). The share link is the viral object for agencies prospecting their own clients. I could not see the live result state (Turnstile blocked the headless run), so audit what `web/src/app/grade/[token]/page.tsx` already renders before building.

**/sample-report** (3,575 px desktop, 5,338 px mobile). This is the highest-leverage page. The sheet should stay warm paper in both themes, like a PDF in a viewer. It is currently a 590 px white box on beige with the same radius and shadow logic as the /grade form card, so it still reads as a UI card. Add page furniture: cover block (the existing `sample-cover-sheet.tsx` has client, prepared, scope, engine), a running header, "Page 1 of N" in mono, a document number, a signature or "Prepared by" line, severity definitions in one line each (borrowed from the accessibility.build sample: Critical is "blocks a disabled user from completing the task, no workaround"), findings as a table on desktop (ID, rule, severity, WCAG SC, state) and cards on mobile, "Limitations" in the body rather than the footer, and a PDF and CSV from the same data with a print stylesheet. Show all three critical findings. Reword the caption at line 175.

**/pricing** (six exhibits, 5,018 px desktop, 7,783 px mobile). Cut to three labeled exhibits (Plans, Compare, Alternatives); FAQ and "Before you pay" become plain headings. Set prices as large Newsreader numerals, keep the ruled rows (the Anytype hairline pattern, [Anytype](https://anytype.io)), and consider one contrasting band for the paid plan instead of a "Most popular" badge ([Glyphs](https://glyphsapp.com/buy)). Put the "as of Oct 2026" date inside the comparison table caption, not only in a paragraph. Resolve the unbuilt-feature framing (owner decision below).

**/for-agencies** (5,662 px desktop, 8,615 px mobile; not examined in detail). Apply the same scaffold rationing and mobile shortening. The illustrative client roster is correctly flagged "not real client data"; keep that flag. Add the report-footer sample as a visible paper sheet, since the white-label deliverable is the product here.

### AI-tell audit

| Tell | Status on personaudit.com | Fix |
|---|---|---|
| Purple or indigo gradient | Absent; primary is a cool ink blue used sparingly | None |
| Centered hero, pill badge, three feature cards | Absent; hero is left-aligned with a live artifact | None |
| Uniform rounded cards, glass, soft shadows | Absent; radius 3 px, ruled rows, tables | None |
| Inter everywhere | Absent; Newsreader plus Plex | None (Plex pairing is common in 2026 but reads chosen) |
| Invented metrics, logos, testimonials | Absent; probe ledger uses real numbers with a null result | Keep; no placeholder logos ever |
| Identical section rhythm | **Present**: tab, rule, doc number, two columns, repeated up to six times per page | Ration the scaffold to evidence sections; vary layout |
| Dev-tool default look in dark (periwinkle CTA, amber highlight) | Present for dark-OS visitors | Paper sheets stay paper in dark; keep amber for highlight only |
| Same device as a competitor | Highlighter shares Deque's hero device ([Deque](https://www.deque.com/)) | Use the highlighter once per page; add one redline correction |
| Shared hue for two meanings | Amber highlighter and amber "Serious" severity | Keep severity amber; move highlighter off the severity hue or reduce its use |
| Unexplained fixed code | `PA-0426` appears on every page including "END OF FILE" | Decide its meaning (owner) or vary it per page date |
| Tiny labels | 8.5-11 px mono labels, 10.5 px hero caption | 12 px minimum for real labels |
| "Fix it by going second-wave" | Do not swap to terracotta on cream or acid green | Documented second-wave defaults ([Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/)) |

The guiding principle from that source is worth keeping on the wall: a tell is "evidence of a default nobody chose, never proof that a model made the page." The test for each remaining item is whether someone chose it.

### Signature moves

Pick two. **First, "the paper that never goes dark":** the hero sheet and the report sheet stay warm paper in dark mode (effort 0.5-1 day, scoped token re-declaration under a wrapper class). It fixes the biggest weakness and is ownable. **Second, the annotated defect overlay:** a frozen screenshot of a real defect with two or three numbered redline rings, each a real `<button>` opening a margin note (rule id, WCAG success criterion, selector, fix), Tab through in DOM order, Esc closes, a 3 px focus ring, no hover-only content, and the notes list always visible below as the static fallback (effort 2-3 days). Cheap additions: `FIG. 1` and `FIG. 2` captions (2 hours), and the redline correction replacing the highlighter on one headline per page (2 hours). Held for later: a "run it twice" determinism demo that replays stored JSON client-side and shows identical counts (1-2 days, scan only, never personas), and a crawl-map scrubber with roving tabindex. Image generation supplies texture and stamps only; product artifacts stay real, in keeping with the site's honesty stance.

### Open decisions the owner must make

| Decision | Options | Recommendation |
|---|---|---|
| Default theme | Follow OS (today), force light, force dark | Keep OS-follow; make paper survive in dark. Confirm the toggle persists the choice and that an inline no-flash script exists (unverified) |
| What `PA-0426` means | Month-year, a case number, decorative | Give it a stated meaning or vary it by page date |
| Framing of the $199 tier | Sell what exists; keep roadmap as one dated line; or keep "funds hosted login" | Sell what exists. Demand for the hosted login is unknown per the local review |
| Build hosted behind-login scanning | Yes (2-4 weeks), no, or wait for demand | Wait for demand signals; it is the largest feature gap but carries the heaviest credential risk |
| Free grade cap | Keep 10 pages, or raise toward Pope Tech's 25-page free sample | Test 15-25 if the Turnstile-gated scan cost allows; it is the lead magnet |
| Card-up-front 14-day trial and Turnstile friction | Keep, or move card capture to day 14 or offer a no-card path | A/B only after the funnel is instrumented; not enough data to call |
| PDF generation route | Server-side render of the same data, or print stylesheet only | Server-side PDF; agencies attach it to retainers |
| Highlighter policy | Keep per-page use, limit to once, or replace with redline | Once per page, plus one redline correction |
| Who reviews legal copy | Counsel for the liability kit and VPAT-lite | Required before publishing either |
| Image generation | Use Magica, Gemini, or skip decorative assets | Confirm Magica works first; it has been "green-but-lying" before |

## Go-to-market

The wedge is the agency that builds sites for small and mid-size clients, because defendants skew small and mid-size (a UsableNet-derived summary puts most sued companies under $25M revenue, secondary source: [AccessNewswire](https://www.newswire.com/news/digital-accessibility-lawsuits-surge-in-2025-22618502)). The free grade is the lead magnet and its share link is the distribution object, so the /grade cover sheet and a "email me this report" path matter more than any ad. Agencies use the grade to prospect their own clients, then convert to the Solo or Agency tier for the white-label delta. Sequence: fix the trust leaks, publish `/method` and `/security`, ship the PDF and PR comment, then launch with a Show HN and an agency-community post that leads with the scan and CI gate (not personas, given the reception of AI usability Show HNs). Comparison pages and the dated lawsuit hub carry search traffic that the current generic guides will not win against larger vendors; keyword volumes were not researched, so run an SEO pass before committing to topics. Pricing sits well: $39 is above the $29 indie floor ([AccessAudit launch](https://reddit.com/r/SaaS/comments/1p5t331/)), and $199 is at the median for agency white-label scanners, so differentiate on CI gate, citable axe verdicts and honest coverage, not price. Pope Tech and Equalize both cap sites (25 at $225), so unlimited projects on the $199 tier is a quiet advantage worth stating. Instrument grade, share-link opens and signup; demand and retention are unknown today.

## Research coverage limits

Firecrawl was out of credits (HTTP 402) during the baseline, open-source and design passes, so galleries were only partly browsed: godly redirected to recent.design, Mobbin and Awwwards were not visited, and Vercel, Raycast, Stripe, Tailscale and several others were measured or viewed at the fold only, with no below-fold or motion capture. The Lighthouse MCP timed out, so the CLI was used; the numbers are single-run lab data with no CrUX field data, and the cause of the 9.8 s LCP was not isolated. Reddit blocks direct fetches (403); content was read through the PullPush archive, which rate-limited after about 15 queries, so several planned queries returned nothing and that is not evidence of absence. G2, Capterra and Slashdot were bot-blocked, Product Hunt and IndieHackers were not reached (IndieHackers returned 403), and no 2026 agency-forum threads on retainers or white-label prices were retrievable; the only direct willingness-to-pay statement is one peer opinion on r/SaaS.

Vendor prices are unverified for Siteimprove, Level Access, TPGi, BrowserStack, Evinced, accessiBe and UserWay (aggregator figures conflict), and Deque, Silktide and Stark publish no prices. Primary UsableNet and WebAIM reports were not read; counts come from Seyfarth and secondary summaries, and the 1,400 overlay-site-lawsuit figure comes from competing vendors. The 30-40 percent practitioner coverage folk number and Deque's 57 percent by volume are both cited with caveats; neither should be presented as a Personaudit statistic. The live /grade result state, the signed-in app and the for-agencies page at mobile reading size were not seen, no manual screen reader pass was run, and what the theme toggle persists is unconfirmed. Several "missing" items depend on the repo's current state: `findings-trend.tsx` suggests a trend view exists, `grade-copy-link.tsx` and `grade-verdict-stamp.tsx` suggest parts of the result sheet exist, and PDF export, client viewer roles and persona trace output were not verified. Verify each before building. No user research or A/B data exists on which design direction converts. Effort figures are estimates. Design notes mention that Magica was previously unreliable; test a generation before relying on it. The AI-UX competitor set lacks data on UserTesting AI, Useberry, Uizard and others.

## Conclusion

The research changes the framing of the gap. Personaudit does not lack a better scanner; it lacks the evidence that its honesty is real and the deliverable an agency can hand a client. The strongest competitive position is the one the product already half-occupies: new-defect gating with stable keys, published prices, explicit coverage limits, and persona results scoped to task success. The work that converts that into revenue is mostly packaging: a PDF with a scope block, a coverage table, a monthly delta, a PR comment, a methodology page, and a security page. None of it needs a new engine.

The less obvious implication is that the positioning rules are a product feature, not a constraint. Every competitor that markets compliance, a pledge or a score invites the FTC-shaped risk that agencies are now warned about, and every persona vendor that skips validation invites NN/g's skepticism. Personaudit can be the tool that shows its null results, defines its grade, and refuses to say "compliant". The design should say the same thing physically: a paper document that stays paper in the dark. The one decision that most shapes the next quarter is whether to build hosted behind-login scanning; the evidence says it is the largest gap and also the one with no demand signal yet, so test demand before building it.

## Appendix A: Image-generation prompts (Magica or Gemini)

Use for decorative texture only (`alt=""`, under about 150 KB each, check text contrast over any texture). Test one generation first, since Magica has reported connected while failing authorization. Prompt 6 belongs to the rejected Direction B and is listed only for completeness.

1. Paper texture, light theme background (tileable):
```
Seamless tileable texture of warm off-white uncoated archival paper, extremely subtle fiber and grain, no stains, no wrinkles, no shadows, no text, flat even lighting, neutral warm tone close to #F6F3EB, low contrast, 2048x2048, photographic scan quality.
```

2. Ledger rule overlay:
```
Seamless tileable pattern of very faint horizontal ledger rule lines and a single faint vertical margin line in pale blue-grey on transparent background, hairline weight, 4% opacity feel, technical document stationery, no text, vector clean.
```

3. Exhibit stamp:
```
A rubber ink stamp impression reading 'EXHIBIT' in a heavy condensed serif capital, slightly uneven ink, imperfect edge, vermilion red ink (#BE260B) on transparent background, rotated 4 degrees, high resolution, no border box, no extra words.
```

4. Redline annotation marks sheet:
```
Set of hand-drawn proofreader's marks in red pencil on transparent background: circled number badges 1-5, a caret, a strike-through line, a bracket, a margin arrow; confident single-weight strokes, slightly imperfect, no text other than the numbers, flat, suitable for SVG tracing.
```

5. Dark theme night grain:
```
Seamless tileable dark navy-black surface #080E16 with very fine film grain and an almost invisible vignette-free noise, no gradients, no glow, no objects, 2048x2048.
```

6. Hero side-art (Direction B only, not recommended):
```
Monochrome ASCII and box-drawing character rendering of a website wireframe being scanned, green phosphor text #72ED7B on near-black #08120C, dense monospace character grid, a few characters highlighted amber, crisp, no blur, no glow, no people, 16:9.
```

7. Social or OG card background (use a real rendered sheet instead if possible, since product artifacts must stay real):
```
Flat top-down photograph of a plain white audit report on a dark desk, a red pencil lying diagonally, the page text intentionally blank and unreadable, soft window light, shallow depth of field, no logos, no hands, no brand names.
```

## Appendix B: Consolidated prompt for Google Antigravity

Paste everything inside the block.

```
You are working in the repo at /Volumes/LizsDisk/multipersonas, in the Next.js 16 app at web/ (React 19, Tailwind CSS 4, pnpm). Implement the design changes below. Leave changes uncommitted in the working tree and end with a summary of every file changed plus before and after screenshots at 390, 768 and 1440 px in both light and dark themes.

READ FIRST (required, in this order)
1. web/AGENTS.md. It says this Next.js has breaking changes; read the relevant guide in node_modules/next/dist/docs/ before writing code. Do not edit web/AGENTS.md or web/CLAUDE.md.
2. web/DESIGN.md (the canonical "Evidence Dossier" design system, light first). If it and the code disagree, the code wins.
3. web/src/app/globals.css (tokens at roughly lines 50-90 and the dark theme), web/src/app/page.tsx, web/src/components/dossier/*, web/src/components/ui/*.

HARD POSITIONING RULES (never violate, in code or copy)
- Personas are never pitched as finding accessibility defects better than a crawler. Deterministic axe-core findings are the accessibility evidence. Persona output is labeled "Opinion · AI" and is about task success only.
- Never simulate a disabled user, and never write copy that implies it.
- No surface may claim hosted behind-login scanning. It is not built. Behind-login scanning is CLI only. Keep the existing "Not built" and "Roadmap" statements and the "CLI only" notes.
- Never write "compliant", "compliance guaranteed", "protects you", or "fixed". A letter grade means only: no axe-detectable WCAG A/AA violations on the pages reached.
- Do not invent customers, logos, testimonials, metrics, or quotes.
- No em dashes anywhere in copy, comments, or docs. Use commas, colons, or hyphens.

ACCESSIBILITY REQUIREMENT: WCAG 2.2 AA, no exceptions
The site's own CI (.github/workflows/a11y-dogfood.yml) scans the deployed site with axe and fails on any violation. Verify at minimum: 1.4.3 text contrast 4.5:1 (3:1 large), 1.4.11 non-text contrast 3:1, 1.4.10 reflow at 320 px with no horizontal scroll, 1.4.12 text spacing, 1.4.13 no content only on hover, 2.1.1 keyboard, 2.2.2 pause for motion over 5 s, 2.4.7 focus visible (keep the existing 2px ring with 4px offset), 2.4.11 focus not obscured, 2.5.8 targets at least 24 px, 4.1.2 name, role, value for every control, correct ARIA for any tablist. Gate all motion behind prefers-reduced-motion. Color is never the only signal: severity and outcomes use glyph or text plus color. Use design tokens by name, never raw color values. Both themes must pass.

DO NOT TOUCH
src/ (the CLI engine), worker/, web/src/lib/plans.ts, billing, checkout and Stripe code, web/src/app/api/, Supabase files, web/next.config.ts (a separate task owns the CSP change), and any pricing or plan logic. Do not change plan names, prices, trial terms, or capability-ledger claims. Do not add dependencies.

DESIGN DIRECTION: "Paper Ledger", light first
Keep the existing tokens and fonts (Newsreader display, IBM Plex Sans body, IBM Plex Mono for IDs, rule names and commands). Display tracking between -1% and -2%. Tabular numerals for counts. Banned: gradients, glass blur, mascots, emoji icons, count-up stats, a second decorative font, terracotta on cream, acid green on black, rounded-2xl card kits. Radius stays at the existing small value.

TASKS, in priority order

1. web/src/app/sample-report/page.tsx and web/src/components/dossier/sample-cover-sheet.tsx
   - Reword the caption at line 175 ("The report says what broke. This shows who it stopped.") to task-success language, for example: "The report says what broke. This shows whether a first-time visitor could finish the task." Keep the "Opinion · AI" badge.
   - Make the report sheet stay warm paper in BOTH themes: add a scoped wrapper class in globals.css that re-declares the light-theme surface and ink tokens for the sheet, so it reads as a PDF on a desk even in dark mode. Verify contrast in both themes.
   - Add page furniture: running header, "Page X of N" in mono, a document number, a "Prepared by" line, and a one-line definition for each severity (Critical, Serious, Moderate, Minor) so severity is legible without color.
   - Show all three critical findings (the page currently excerpts two). Findings render as a table on desktop (ID, rule, severity, WCAG SC, state) and as cards under 640 px.
   - Move "Limitations" into the body, above the footer. Add a print stylesheet so Print produces clean pages.

2. web/src/app/grade/[token]/page.tsx (result page) and components in web/src/components/dossier/ (grade-verdict-stamp.tsx, grade-copy-link.tsx, grade-finding-row.tsx already exist; reuse them, audit what is rendered before building)
   - Design the result as a cover sheet: a large letter tile in Newsreader beside a key/value strip (site, scanned time in UTC, pages reached such as 7/10, axe-core version). Every outcome is text plus icon plus color. Add tabs for Findings, Pages, Method (a keyboard-operable tablist with correct roles, aria-selected and arrow-key navigation). Keep the copy-share-link button prominent with a timestamp. Add a "How this grade is calculated" disclosure that shows the arithmetic and states what the letter does not mean. Show "needs manual check" and "not tested" counts beside the letter.
   - Do not touch the grade API or the Turnstile flow.

3. Ration the "EXHIBIT" scaffold (web/src/components/dossier/exhibit-head.tsx and pages)
   - Use the black EXHIBIT tab, rule and PA-0426 number only on evidence sections (home hero evidence, sample report, grade results). Elsewhere use a plain Newsreader heading.
   - Reduce /pricing from six exhibits to three labeled exhibits (Plans, Compare plans, Alternatives). FAQ and "Before you pay" become plain headings. Do not change any claim, price, or ledger row text. Put the existing "as of" date inside the comparison table caption.
   - On the home page and /for-agencies, vary layouts so no three adjacent sections share the same two-column heading-left layout: make the CLI procedure a full-width mono band with no tab scaffold, and one section a single-column essay with a sidenote.

4. Hero and signature touches
   - Add a boxed "FIG. 1" caption to the home hero evidence sheet (web/src/components/dossier/evidence-sheet.tsx) and "FIG. 2" to the crawl map. Mono, uppercase, bordered.
   - Use the highlighter (.mark, .mark-sweep) at most once per page. On the home page, replace one other highlighter use with a redline correction: a struck-through phrase followed by the corrected phrase in the --redline token. The strike-through must carry visually hidden text such as "(removed)" and "(replacement)" for screen readers.

5. Legibility and length
   - Raise every real label under 12 px (8.5 to 11 px mono labels, the 10.5 px hero caption) to at least 12 px. Decorative text inside the illustrative mini-screenshots may stay, but give those images accurate alt text.
   - Shorten mobile pages: collapse the home CLI steps and the pricing FAQ behind accessible disclosures (native <details> is fine). Target home under 6,000 px tall at 390 px width.

6. Performance investigation (report first, then fix only if the cause is clear and local)
   - Home mobile LCP measured 9.8 s with 93% element render delay on a text paragraph. Find the cause (font swap, reveal animation, or hydration blocking paint) with a Lighthouse or DevTools trace, state it in the summary, and fix it if it is a CSS or animation delay. Remove the five unused font preload warnings if they come from our code.

VERIFICATION (run from /Volumes/LizsDisk/multipersonas/web and report real output)
pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build
pnpm test:e2e
Then axe-scan every changed page in light and dark at 390 and 1440 px and report zero violations. Confirm no horizontal scroll at 320 px and keyboard operation of the tabs and disclosures. Confirm with grep that no em dash characters were added. If any check fails, fix it before reporting; do not report success without output.
```
