# Practitioner sentiment: automated a11y scanning and AI usability testing (2024-2026)

Snapshot as of 2026-10-10. Method note: reddit.com and old.reddit.com return HTTP 403 to curl and to wigolo (confirmed 2026-10-10). Reddit content below was read through PullPush (api.pullpush.io), a third-party Reddit archive, which returns comment text, subreddit, score, and permalink. Quotes are truncated by me at about 1,000 characters; I did not open the live threads. Hacker News was read through the Algolia API. G2, Capterra, and Slashdot return bot challenges (blocked). Product Hunt and IndieHackers were not reached (see Gaps). PullPush also rate-limited after about 15 queries, so several planned queries (agency retainers, Siteimprove noise, white-label reports, Lighthouse-score gaming on Reddit) returned nothing and are NOT evidence of absence.

Quotes are short or paraphrased. Usernames omitted. Score = Reddit upvotes at archive time.

## 1. What agencies and freelancers say about selling accessibility and the tools they use

### Takeaway
Agencies describe accessibility as a service they are pushed into by lawsuits or EU law, not one clients ask for. The recurring split is: scanners are a starting point, humans are the audit, overlays are toxic, and clients push back on budget. One practitioner told a would-be scanner founder directly that scan-and-report alone is "nice to have" and that the product must help agencies earn revenue.

### Cited Findings
- (D1) Direct feedback to someone building a BFSG/EAA scanner for agencies: "Agencies know these tools only catch around 30-40 percent of accessibility issues, so they still need manual audits. If your product only scans and reports, agencies may see it as a 'nice to have,' not something worth paying monthly for." Same comment: "Many agencies push compliance responsibility to the client unless they sell maintenance packages... the tool must help them generate revenue, not just avoid risk. White label reports that help them upsell accessibility fixes could actually be the stronger angle." Score 2, r/SaaS, 2026-03-06 (single commenter; a peer opinion, not a survey) — [thread](https://reddit.com/r/SaaS/comments/1rm9x0i/verifying_a_bfsgeaa_accessibility_compliance_tool/o8ybz8s/)
- (D2) Freelancer on an EAA question: a non-profit client wanted to install a plugin; the freelancer explained the whole site still needed manual remediation. Site was "close to AA compliance but it would take me about 20-30 hours to get it compliant. And they simply just don't have that budgeted for this year." Budget, not awareness, is the blocker. r/Wordpress, 2025-02-15 — [thread](https://reddit.com/r/Wordpress/comments/1ioqfex/how_concerned_should_i_be_about_the_european/mcxfpux/)
- (D3) Agency with healthcare brands: "We don't ever recommend using overlays to our clients but baking in good accessibility right into the page." Notes disabled users "hate accessiBe type overlays because they conflict with their existing screen reader tools" and that accessiBe and its customers were sued over a false sense of "full compliance." Score 2, r/accessibility, 2025-07-26 — [thread](https://reddit.com/r/accessibility/comments/1m6geg8/you_keep_your_brand_colors_we_make_it_accessible/n59heaf/)
- (D4) Advice to an agency that was told to install an overlay after the EAA: the EU advises against relying on overlays, accessiBe was fined $1M by the FTC, and "you cannot shift the responsibility of accessibility compliance to third parties. If you publish the content, you are responsible"; an agency's accountability falls on its clients who deliver the content. Score 4, r/accessibility, 2025-07-25 — [thread](https://reddit.com/r/accessibility/comments/1m8vtjb/forced_to_do_satans_work/n538xe1/)
- (D5) Agency owner (15+ years in software) first used "basic 'Widget' support," then changed course after a friend's chiropractic practice got a lawyer's demand letter even though the site was mostly accessible but not "the highest score." Posted twice in 2026, same text. Score 1, r/smallbusinessowner 2026-01-17 and r/smallbusinessUS 2026-01-18. The post is also self-promotional, so treat as a founder narrative — [thread](https://reddit.com/r/smallbusinessowner/comments/1qfyzhy/everything_i_learned_about_wcagaccessibility/)
- (D6) Developer who was assigned to fix accessibility across sites said competing tools "gave a lot of false positives, slow scans and also how they displaying the errors," then built his own axe-based scanner (a self-promoting comment). r/accessibility, 2025-08-25 — [thread](https://reddit.com/r/accessibility/comments/1mzltkm/what_vendors_do_you_recommend_for_site/nan4ud5/)
- (D7) Accessibility consultant on the "ethical selling" side: agencies "white labeled overlay widgets or became an affiliate for them", "marketers selling scans as audits", and the legal theory of "detrimental reliance" could reach agencies that promote overlays. Vendor blog (Accessible.org, an audit vendor with its own interest), 2024-12-15 — [article](https://accessible.org/how-to-ethically-sell-accessibility-services-as-a-digital-agency/)
- (D8) EU public-sector procurement angle: a freelancer proposed a product to a public-sector client and the process was rejected because the vendor had no VPAT or accessibility statement; "Procurement Compliance during the mandatory Vendor Accessibility Assessments or VPAT audits." Also claims the national market-surveillance bodies are backlogged with EAA complaints (unverified claim). Score 7, r/ProtonMail, 2026-06-07 — [thread](https://reddit.com/r/ProtonMail/comments/1tyo09h/another_ios_update_without_accessibility_fix/oq8285q/)

### Inferences
- The agency purchase driver is revenue-per-client plus liability shielding, not detection. A report that is the agency's deliverable (branded, scoped, with a delta) matches D1 and D3.
- Client budget (D2) means the agency's pitch is a cheap retainer and scoped remediation hours, not a full audit.
- D7/D4 show agencies are warned against two behaviours: reselling overlays and calling a scan an audit. Personaudit's honest-scope framing is aligned with where informed practitioners already are.

### Gaps
- No agency-voice thread about white-label reporting prices or retainer rates was retrievable (PullPush rate limit). The only direct willingness-to-pay statement is D1.
- G2/Capterra/Slashdot reviews for Pope Tech, Siteimprove, WAVE, Silktide, Equalize Digital: blocked by bot challenge. Not read.

## 2. What practitioners hate about scanners: false positives, score gaming, noise, accuracy

### Takeaway
The dominant complaint is not that axe-style tools are wrong, it is that a green number is mistaken for compliance and that scanners cannot judge context. "False positives" come up from auditors, while vendor-side commenters claim axe has none. Both can be true: the pain is false confidence and missed issues more than false alarms.

### Cited Findings
- (S1) Working auditor: "scanners never give you the full picture of your website's status—you can't rely on them as the final word. I've even seen cases where they produce false positives, which is counterproductive. The standard practice is always to have a specialist conduct an audit." Score 2, r/accessibility, 2026-06-30 — [thread](https://reddit.com/r/accessibility/comments/1ujlhxo/has_anyone_here_actually_benefited_from_a/outij0m/)
- (S2) Another auditor's workflow: keyboard-only navigation, then a screen reader pass, "rule out any errors reported by the screen reader," then contrast and color-only checks. Scanners are not the method. Score 27, r/accessibility, 2026-08-06 — [thread](https://reddit.com/r/accessibility/comments/1vh3b62/the_state_of_web_accessibility/p21z2ge/)
- (S3) Lighthouse score gaming: "you can easily get a score of 100 without actually addressing all the accessibility issues... you can just point at the score and say 'all good' while your site might still have major issues." Hacker News, 2024-02-11 — [comment](https://news.ycombinator.com/item?id=39331626)
- (S4) Web dev recommending WAVE: its extension gives "better and more accurate insight than the scanner... I haven't found a more accurate tool that doesn't throw false positives." Score 1, r/Wordpress, 2024-01-23 — [thread](https://reddit.com/r/Wordpress/comments/19dc7hq/audits/kj9d1it/)
- (S5) Agency-side caveat about automated checks: "They can highlight potential areas of improvement, but they can't always pick up the full context... They will miss things and occasionally misidentify things." Score 1, r/codestitch, 2025-03-14 — [thread](https://reddit.com/r/codestitch/comments/1jb7po6/seo_services_but_every_website_that_sells_it/mhrz7f6/)
- (S6) WordPress-focused accessibility vendor comment: axe-core is "considered by many to be the best rule set and most accurate engine having no false positives (not including actual bugs)", and their own product layers headless Chrome plus secondary analysis (screenshots, contrast over images/video) on axe output. Vendor voice. Score 1, r/accessibility, 2026-01-07 — [thread](https://reddit.com/r/accessibility/comments/1q6ely7/how_do_you_use_axecore_for_accessibility_testing/ny7p6zc/)
- (S7) Equalize Digital Accessibility Checker (WordPress.org, 2026): one reviewer reported that after v1.40.0 the plugin's own front-end widget was flagged as non-compliant (aria-hidden on a decorative icon). The vendor said that was a cached-scan-script issue and it could not be reproduced on a fresh install. Another 2026 review ("ignore log keeps resetting") complains about a pro feature. Overall, the review feed is mostly positive; the notable negative is a tool flagging itself — [reviews index](https://wordpress.org/support/plugin/accessibility-checker/reviews/), [widget thread](https://wordpress.org/support/topic/v-1-40-0-update-finds-its-own-widget-out-of-compliance/), [ignore-log thread](https://wordpress.org/support/topic/helpful-but-ignore-log-keeps-resetting/)
- (S8) Proportion of coverage: the 30-40% figure appears in D1 as folk knowledge. Deque's own study claims 57% by issue volume (already in `agency_buyers_and_legal.md`); the practitioner folk number is lower and persists.

### Inferences
- "Ignore/accept known issue" workflow (S7 ignore log) is a real daily-use feature: people need to suppress false alarms without losing the record. Personaudit already has baselines; this validates making ignore state durable and auditable.
- A visible numeric score is both loved (buyers want one number) and distrusted (S3). Show findings by criterion and "not tested" counts, with the score secondary.

### Gaps
- No archived thread with concrete false-positive examples (rule IDs) was reached. S1, S4 are generic.
- No Siteimprove or Silktide complaint threads retrieved.

## 3. Liability and legal fear among practitioners

### Takeaway
Fear of demand letters and lawsuits is the real urgency driver, and practitioners connect it to overlays and "compliant" claims. They also resent opportunistic plaintiff firms.

### Cited Findings
- (L1) Accessibility engineer: law firms are "actively scanning the internet to find companies who have accessibility issues which are primarily widgets or overlays," email them, give them 90 days, then threaten suit; claims "400% increase in these suits over the last two years" (unverified, anecdotal). Hacker News, 2024-07-23 — [comment](https://news.ycombinator.com/item?id=41051640)
- (L2) The FTC action against accessiBe ($1M, misrepresented compliance claims) is the shared reference point and is repeated unprompted in D3/D4 and an HN comment from 2026-09-16 — [comment](https://news.ycombinator.com/item?id=49731836)
- (L3) Overlay controversy: Level Access acquiring UserWay in 2024 "hit the accessibility community like a ton of bricks"; overlays are "seen as worse than useless among accessibility professionals." Hacker News, 2024-04-07 — [comment](https://news.ycombinator.com/item?id=39964793)
- (L4) A browser plugin AccessiByeBye exists solely to block overlays because they break keyboard and screen reader use. Hacker News, 2026-02-11 — [comment](https://news.ycombinator.com/item?id=46972435)
- (L5) German auditors rejecting overlays in the EAA context was submitted to HN in 2026-01 (title only) — [submission](https://news.ycombinator.com/item?id=46507033)

### Inferences
- Copy must never imply "compliant," "protects you from lawsuits," or "fixes." Even the neighbours who sell scans are warned about the same trap.

### Gaps
- No primary source on lawsuit counts beyond what is already in `agency_buyers_and_legal.md`.

## 4. What do UX researchers say about synthetic users and AI user testing

### Takeaway
UX researchers are overwhelmingly skeptical of synthetic users as replacements for real participants, calling the output plausible-sounding "research theatre". The accepted narrow uses are: prepping interview guides, exploring edge cases after real research, and testing agent-facing flows. Builders on HN get a mix of polite interest and ethical pushback.

### Cited Findings
- (U1) "I hate every part of this. This will be a novelty that will fade into oblivion when you get serious push back from seasoned researchers and leadership. ... 'This was tested with our AI personas' / 'didn't we test this with real users?'" Score 20, r/UXResearch, 2025-06-05 — [thread](https://reddit.com/r/UXResearch/comments/1l4ag70/thoughts_on_synthetic_personas/mw7fj5g/)
- (U2) "[Synthetic users] create research-shaped outputs, but that is just research/UX theatre at scale." Score 8, r/UXResearch, 2026-06-16 — [thread](https://reddit.com/r/UXResearch/comments/1u7r7ur/automated_research_logistics/os35fxx/)
- (U3) Researcher's worry about PMs: "Why even bother talking with real humans when synthetics 'can get us 80% of the way there?' Just gonna be a race to the mean." Score 6, r/BetterOffline, 2026-03-27 — [thread](https://reddit.com/r/BetterOffline/comments/1s5dzjn/well_then_guess_pms_are_now_creating_softslop_so/ocuedx8/)
- (U4) Early-career researcher forced to review synthetic personas built by a data scientist from data that "didn't even belong to our typical customer"; had to keep reminding the team these were not real users. Score 3, r/womenintech, 2026-08-06 — [thread](https://reddit.com/r/womenintech/comments/1vh83e5/had_a_call_today_with_engineering_about_ai/p2639u4/)
- (U5) Accepted narrow uses: "use AI users to explore edge cases based on the real user interviews" after primary research (r/UXResearch 2025-12-23, score 3, [thread](https://reddit.com/r/UXResearch/comments/1ptitut/seriously_who_actually_wants_these_ai/nvnnjs1/)); and synthetic users built from real transcripts to "figure out what kinds of questions to ask" before real interviews, plus a view that agentic traffic may make synthetic users relevant (score 5, r/UXResearch 2026-08-12, [thread](https://reddit.com/r/UXResearch/comments/1vmpjlg/opinions_on_synthetic_users_for_research/p3bb756/)).
- (U6) "The distilled output sounds plausible but the actual connections based on which that output has been arrived-at is not known." Score 9, r/UXResearch, 2026-07-26 — [thread](https://reddit.com/r/UXResearch/comments/1v77hj5/how_does_ai_replace_uxrs/ozwa1i9/)
- (U7) Poster in r/artificial summarizing a 2026 study on LLM preference simulation: believing LLMs can simulate preferences is "naive," but vendors sell synthetic users to replace interviews and "I've seen a lot of people, even in the user research industry, falling for this." Score 4, 2026-07-07 — [thread](https://reddit.com/r/artificial/comments/1uq52r8/ai_cant_simulate_human_preferences_new_study/ow6jnbm/)
- (U8) HN, 2025-08-01: a commenter in creative AI tools calls AI-persona focus groups "one of the areas of AI that gives me the most concern," especially for local-government consultation: "LLMs don't live in communities. They don't vote, experience public services, or have lived context." — [comment](https://news.ycombinator.com/item?id=44757139)
- (U9) Builder reception on HN: Show HN posts for AI usability testing (Simulated user testing, Juno, Behavr, Acceptify, kiwi) mostly drew 1-3 points and requests for feedback; the closest that tests real UI flows (Behavr, "runs AI agents through your Figma prototypes", 2026-02-20 and Acceptify, 2026-02-06) describe themselves as speeding up or replacing slow testing. I did not see comment threads with strong adoption evidence — [Behavr](https://news.ycombinator.com/item?id=47086059), [Acceptify](https://news.ycombinator.com/item?id=46913402), [Juno](https://news.ycombinator.com/item?id=43363272)
- (U10) Practitioner and academic essays: ACM Interactions (Jan-Feb 2026), "AI-simulated users... an incomplete and potentially misleading substitute for direct human observation," lacking emotional depth and social context — [ACM](https://interactions.acm.org/archive/view/january-february-2026/the-challenges-of-synthetic-users-in-ux-research); UXArmy on "AI sycophancy" reinforcing assumptions — [UXArmy](https://uxarmy.com/blog/synthetic-users-in-ux-research/); UXAtlas: synthetic participants "too consistent, too agreeable" — [UXAtlas](https://www.uxatlas.io/articles/synthetic-users-evidence). Counter-evidence is cited by one blogger: NN/g digital twins filled in missing survey data with 78% accuracy and aggregate correlation r = 0.98 — [Ian Reppel](https://ianreppel.org/synthetic-users/) (I did not open the NN/g primary source). Search-result snippets only for UXArmy/UXAtlas/ACM; full pages timed out.

### Inferences
- Personaudit's existing stance (personas validated for task success, not for opinion; never claim disability simulation) is consistent with the best-supported practitioner view. The framing researchers can accept: "agent attempts a goal and records where it fails, with traces", not "synthetic customers tell you what they feel."
- U5's agentic-traffic argument gives a forward-looking angle: an AI agent that fails to complete checkout is itself a finding, since real agents will visit.

### Gaps
- r/userexperience and r/web_design returned no relevant threads (not retrieved, rate limit).
- Product Hunt comments for AI usability launches not reached.
- No data on whether agencies (as opposed to in-house researchers) would pay for persona runs.

## 5. Willingness-to-pay and pricing signals

### Takeaway
Direct, citable WTP evidence is thin. The best signals are structural: agencies pay when the tool becomes a billable deliverable; free tools and $29-ish starter pricing are the norm among small competitors; budget is the client-side constraint.

### Cited Findings
- (P1) See D1: pay if it helps "generate revenue"; white-label reports "to upsell accessibility fixes" is "the stronger angle." r/SaaS, 2026-03-06.
- (P2) Competing indie scanner (AccessAudit) launched at "paid plans start at $29/mo," 25% launch discount, scheduled scans and email notifications, PDF/CSV, AI code fixes, and said "Email notifications dramatically improve engagement." r/SaaS, 2025-11-24 (self-promo) — [thread](https://reddit.com/r/SaaS/comments/1p5t331/)
- (P3) Free competitors: Show HN "Free ADA compliance scanner" (Lighthouse 0-100 score plus shareable PDF for leadership, 2025-08-26) — [post](https://news.ycombinator.com/item?id=45030899); AccessiGuard (scanner with AI fix suggestions, PDF reports, 2026-02-13) — [post](https://news.ycombinator.com/item?id=47007846). The category has many low-cost entrants.
- (P4) Client budget limits: D2 (no budget for 20-30 hours of fixes).
- (P5) Procurement: public bodies require VPAT/accessibility statements (D8); evidence of a document buyers can be asked for.

### Inferences
- $39-199 is above the $29 indie floor and below enterprise tools, so the case for the premium is the agency deliverable layer (white label, delta, scoped statement) and CI gate, not detection.
- None of this is survey-grade; treat as qualitative.

### Gaps
- No G2/Capterra price-satisfaction data. No primary source on what agencies currently pay Pope Tech, Silktide, or Siteimprove (blocked).

## Top recurring pains (ranked by how many independent sources)
1. A scan or a score is mistaken for compliance; practitioners say it covers a minority of issues (D1, S1, S2, S3, S5, D7, L2).
2. Overlays and "compliant" claims create legal and reputational risk for agencies that resell them (D3, D4, D7, L1-L4).
3. Clients do not budget for fixes; agencies push responsibility back to the client unless there is a maintenance package (D1, D2).
4. Noise and false confidence: false positives, self-flagging tools, no durable ignore state (S1, S4, S7).
5. Synthetic user output is plausible but unaccountable and flattering (U1, U2, U6, U10).

## Top willingness-to-pay signals
1. Agencies pay for what generates billable revenue: white-label reports and upsell paths (D1/P1).
2. Scheduled monitoring plus email reporting is a standard paid feature and users say notifications drive engagement (P2).
3. Procurement-facing documents (VPAT-style statements) are requested by buyers (D8), which supports a scoped "VPAT-lite" only if clearly labeled as automated-only.
4. Counter-signal: a free tier is normal and cheap competitors exist at about $29 (P2, P3).

## Implications for Personaudit features and copy
- Feature: lead the agency tier with white-label PDF and monthly delta (new/fixed/regressed) as the deliverable; keep the CI gate as the developer wedge. (D1, P1)
- Feature: durable, auditable "accepted / ignored" state per finding, surviving rescans, with who/when/why; the ignore-log complaint (S7) shows people use this daily.
- Feature: per-criterion table with "tested by axe / needs manual / not tested", score secondary. (S3, D1)
- Feature: an "evidence of manual checks" slot in the report (keyboard pass, screen reader pass, who did it), so the agency can attach its own human audit. (S2)
- Copy: never say compliant, protected, or fixed; say "automated checks catch a subset; here is exactly what this report does and does not cover." Mention overlays only to disclaim them. (D3, D4, D7, L2)
- Copy for personas: "an agent tries your goal and shows where it got stuck, with a trace"; avoid "synthetic customers" and avoid any claim about how real people feel. (U1, U2, U6)
- Copy: do not promise the 30-40% or 57% figure as a Personaudit stat; cite sources and keep vendor-study caveats.
- Pricing: don't compete at $29; justify $39+ with the reporting layer and CI. Free public scan as the lead magnet (P3).
- Liability-aware kit: template language that scopes the agency's promise as "monitoring, not a guarantee" (D4 says liability stays with the publisher).

## Source coverage summary
Read: PullPush Reddit archive (r/accessibility, r/webdev, r/Wordpress, r/SaaS, r/UXResearch, r/ProtonMail, r/smallbusiness*, r/artificial and others), Hacker News Algolia (comments and Show HN), WordPress.org plugin review index and 3 threads, Accessible.org blog, web search snippets for synthetic-user critiques.
Not read or blocked: reddit.com direct (403), G2, Capterra, Slashdot (bot challenge), Product Hunt, IndieHackers, dev.to, Lobsters (429/400 errors), r/agency, r/freelance, r/web_design, r/userexperience (no usable results), Siteimprove/Silktide review pages.
Rung: quotes are read from archive text (rung 2 for "what was said"); no claim here was reproduced in the live threads. Counts of 20+ data points: 8 + 8 + 5 + 10 + 5 = 36 items, some of which are vendor or self-promotional and are labelled as such.
