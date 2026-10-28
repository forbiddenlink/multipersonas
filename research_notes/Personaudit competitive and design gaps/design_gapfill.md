# Personaudit design gap-fill: light theme, reference captures, report and grader analogues

Snapshot as of 2026-10-10. Add-on to `design_inspiration.md` (same folder). All captures were taken 2026-10-10 with Playwright at 1440x900 desktop or 390x844 mobile, `prefers-reduced-motion: reduce` for reference sites. Screenshots are in `/Volumes/LizsDisk/multipersonas/.playwright-mcp/gapfill/` (prefix `pa-light-*` = personaudit.com light theme, `ref-*-fold.png` = reference sites above the fold, `res-*.png` = grader result pages, `gal-*-fold.png` = galleries).

Rung labels: [observed] = seen in a screenshot or read from the live DOM this session; [computed] = my script (canvas color conversion + WCAG formula, treat as +/-0.1); [sourced] = cited URL; [inference] = my judgment. Firecrawl was not used. Read-only: no forms submitted. Two result pages were opened by GET URL (securityheaders.com for personaudit.com, and cached public results for mozilla.org / example.com), which triggers a scan but submits no form.

## 1. Which theme does a first-time visitor see, and how good is the light theme?

### Takeaway
The site follows the OS setting: with no stored preference it rendered dark when `prefers-color-scheme: dark` and light when `light`. The earlier dark-only captures happened because the Playwright default reports dark (`matchMedia('(prefers-color-scheme: dark)').matches` was `true` on a bare context). The light theme is clearly the stronger expression of the "audit case file" concept, and the sample report is already a paper sheet there. The "dark card" critique in the prior note applies only to dark mode.

### Cited Findings
- With the `theme` localStorage key removed: system light gave `html` without `.dark`, system dark gave `.dark`. Both returned `theme: null`, so nothing is persisted until the user acts. A toggle exists ("Switch to light mode" button in the header). [observed, DOM check on personaudit.com]
- A leftover `theme=dark` key from an earlier session in the same browser profile pinned dark and ignored light emulation. That means a returning user who once toggled sees their choice; first-timers see their OS setting. [observed]
- Whether the toggle itself writes `theme` to localStorage was not confirmed: I only clicked it when the page was already dark, and it was light. [gap]
- Full-page heights, light theme, desktop 1440: home 5,351px, pricing 5,018, grade 2,422, sample-report 3,575, for-agencies 5,662. Mobile 390: home 8,691, pricing 7,783, grade 3,484, sample-report 5,338, for-agencies 8,615. No horizontal scroll on any (`scrollWidth` 390 for the mobile run earlier). [observed, `pa-light-d-*.png`, `pa-light-m-*.png`]
- Light palette as rendered: warm paper page band (`oklch(~96.7% .013 86)`), alternating with a near-white band, navy primary button, red mono severity chips, amber highlighter behind one headline phrase, black "EXHIBIT X | LABEL" tabs with a rule and a PA-0426-NN number at right. [observed]
- Contrast, light theme, unique color/background/size combinations on home, sample-report, pricing: 0 text failures against 4.5:1 (3:1 for large). Lowest ratios: amber "Serious/struggling" text on its chip 5.65:1, muted body grey 6.52:1, red 6.03:1. [computed]
- Smallest real text: 11px mono labels (`found at ...`, `DEFECT`, `Session only`, step labels, `$0 forever`), 10.5px "axe-core verdicts only..." caption on the hero sheet, 9.6px and 8.5px inside the illustrative mini-screenshots. [observed via computed font size]
- Keyboard: skip link "Skip to main content" present; focus ring is `2px solid oklch(0.38 0.13 264)` with `4px` offset. [observed]
- Pricing page in light: six exhibits (A Plans, B Plans list, C Compare plans, D Alternatives, E Questions, F Before you pay) plus hero. Grade page: three. Home: four plus hero. [observed]
- The hero "CASE PA-0426 / SAUCEDEMO.COM" sheet on home reads as a real paper artifact (stacked sheet edge, mono caption, highlighted phrase inside the finding). The sample-report sheet is a white sheet on beige with a CLIENT / PREPARED / SCOPE / ENGINE row, severity count strip, numbered "Fix first", per-finding blocks, a persona replay panel, "Method & limitations", a closing CTA. [observed, `pa-light-d-home.png`, `pa-light-d-sample-report.png`]
- A direct competitor uses the same highlighter device in its hero: Deque's H1 "Digital accessibility *done right*" has an orange block behind the second line, on a cream `rgb(246,243,237)` background with Graphik 64px/500. [observed, `ref-deque-fold.png`]
- securityheaders.com graded https://personaudit.com A on 2026-10-10 16:03 UTC with this warning: Content-Security-Policy "contains 'unsafe-inline' which is dangerous in the script-src directive"; "Grade capped at A". Headers present: CSP, Permissions-Policy, Referrer-Policy, HSTS, X-Content-Type-Options, X-Frame-Options. [observed, `ref-secheaders-fold.png`; page https://securityheaders.com/?q=https%3A%2F%2Fpersonaudit.com&followRedirects=on]

### Inferences
Light-theme critique:
1. Strong: paper band vs near-white band rhythm, red-mono severity chips, the hero sheet, the ruled pricing. Nothing here reads as a template, because the typographic and document vocabulary is specific.
2. Weak: the exhibit scaffold (black tab + rule + doc number + two-column) repeats on every section, six times on pricing. In light it looks more like a form header than a case file. Use it where there is actual evidence (home A, sample report, grade results). Plain Newsreader headings elsewhere.
3. Weak: the sample-report sheet is a white box 590px wide inside a wide beige page. It still looks like a UI card (same radius, shadow and padding logic as the form card on /grade). A document needs page furniture: running header, "Page 1 of 4", a cover block, a signature or "Prepared by" line, a visible margin. It also has no print stylesheet check (not tested).
4. Weak: the highlighter is not unique among accessibility vendors (Deque). Keep it but spend it once per page at most, or switch to a redline (struck-through wrong phrase plus handwritten-style correction) that only an audit tool would plausibly use.
5. Small type: nothing fails AA, but 8.5-11px mono labels on mobile are what a low-vision user hits first at default zoom. Raise real labels to 12px minimum.
6. The CSP `unsafe-inline` warning is an own-goal for an agency-facing trust product. A security-minded agency will run securityheaders on you.
7. Dark mode will be the first impression for anyone with a dark OS (common among developers, who are the CLI audience). The paper concept must survive there (see recommendation 1).

### Gaps
- Did not confirm what the toggle persists, whether the page has an inline no-flash script, or how many first-time visitors have dark OS.
- Light mobile screenshots exist but I only read the sample-report mobile page; other mobile pages were not examined at reading size.
- /grade result state not seen (Turnstile blocks headless, and no forms were submitted).

## 2. Reference sites visited and screenshotted (desktop)

### Takeaway
The accessibility-native brands (A11Y Project, GOV.UK, Deque, Stark) are loud or utilitarian rather than document-like; the closest craft precedent for "product expressed in its own medium" is Oxide. Nobody in the accessibility category shows a paper audit document as the hero, which is open ground.

### Cited Findings
Measured with `getComputedStyle` (typography, bg) and viewed in screenshots at 1440px. "Viewed" = I looked at the image; others were measured only.

- Linear (https://linear.app/): Inter Variable 64px, weight 510, line-height 64px, letter-spacing -1.408px (-2.2%); body bg `rgb(8,9,10)` even under `prefers-color-scheme: light` (ignores OS setting); H1 "The product development system for teams and agents"; page 9,954px. [observed, not viewed]
- Vercel (https://vercel.com/): Geist Sans 64px, weight 400, letter-spacing -3.84px (-6%), bg `rgb(250,250,250)`, text `rgb(23,23,23)`; viewed: left-aligned H1 "Agentic Infrastructure", a solid black triangle as the single hero object, three plain text lines at right, then a logo row. Restraint: two buttons only, no gradients. [observed, `ref-vercel-fold.png`]
- Raycast (https://www.raycast.com/): Inter 64px/600, line-height 70.4px, bg `rgb(7,8,10)`, page 15,992px (very long). [observed, not viewed]
- Stripe Press (https://press.stripe.com/): H1 is the 17.6px wordmark "Stripe Press" in Ivar Headline; body Ivar Text/Georgia; bg `rgb(32,24,25)`; viewed: a 3D stack of real book spines (marbled endpaper, gilt, individual typography per book) is the entire hero; a tick-mark index at left; italic serif tagline "Ideas for progress". The product is the artifact, photographed or rendered faithfully, with no UI chrome. [observed, `ref-stripepress-fold.png`]
- Oxide (https://oxide.computer/): SuisseIntl 65px/400, letter-spacing -1.625px (-2.5%), bg `oklch(0.162 0.01 260)`, headline `oklch(0.9 0.0001 260)`; viewed: boxed mono caption "FIG. 1 OXIDE CLOUD COMPUTER" above the product render, a CLI/API/CONSOLE tab panel with real command text, a thin connector line from the terminal to the hardware, dotted halftone edge, uppercase mono nav and "TRY NOW / CONTACT SALES" in square-cornered outlined buttons. [observed, `ref-oxide-fold.png`]
- Tailscale (https://tailscale.com/): Inter 64px/500, -0.64px, bg `rgb(249,247,246)` (warm off-white), near-black pill button, mono uppercase announcement bar; viewed: centered hero, a row of five capability tiles with one in terracotta-red fill. A privacy banner covers the lower fold. [observed, `ref-tailscale-fold.png`]
- Basecamp (https://basecamp.com/): Graphik 42px/800, -1.1px, bg white, text `oklch(0.32 0.02 234)`; page 8,722px. [observed, not viewed]
- HEY (https://www.hey.com/): "Really Sans Large" 83px/900, body "Moniker", bg white, text `rgb(35,28,51)`. [observed, not viewed]
- Teenage Engineering (https://teenage.engineering/): no `<h1>` in the DOM; black page, body "te-20"; viewed: black and white photography of the NYC store, outlined line icons at the top, tiny lowercase nav with sub-links, Japanese microcopy block. Type and photography only, no UI chrome. Page is 2,285px. [observed, `ref-teenage-fold.png`]
- GOV.UK Design System (https://design-system.service.gov.uk/): GDS Transport 48px/700 on a solid blue band, white text, white "Get started >" button with a yellow-black focus convention, left-aligned, an explanatory line-art illustration at right; every component page documents research and testing. [observed, `ref-govuk-fold.png`; testing notes: https://design-system.service.gov.uk/get-started/]
- The A11Y Project (https://www.a11yproject.com/): Noto Serif 55px, bg `rgb(247,247,247)`; viewed: dark green hero with giant magenta serif letters "a11y" cropped by the viewport, a white card with "a11y stands for ACCESSIBILITY" with a bracket-annotation "11 characters" diagram, a pink bordered CTA. Humor and typography do the work; the serif is committed. [observed, `ref-a11yproject-fold.png`]
- Stark (https://www.getstark.co/): ArminGrotesk 110px/900, bg `rgb(246,246,235)` cream; viewed: saturated violet hero with product UI fragments (Violations / Potential Violations / Passed Checks chips, bar chart with avatar bubbles); the H1 was not yet painted in my capture, so its hero composition is incomplete. Cookie banner overlays. [observed, `ref-stark-fold.png`]
- Deque (https://www.deque.com/): Graphik 64px/500, cream bg, centered H1 with orange highlighter block, pastel petal shapes at right, red pill CTA + outlined pill. Conventional enterprise layout. [observed, `ref-deque-fold.png`]

### Inferences
Specific moves worth taking, matched to Personaudit:
- **Hero composition.** Vercel and Oxide put one object in the hero and say little. Personaudit's hero already does this with the case-file sheet. Borrow Oxide's boxed `FIG. 1` caption for the sheet (currently `CASE PA-0426 / SAUCEDEMO.COM`), so the artifact reads as an exhibit with a figure number.
- **Type scale.** Display tracking in the references: Linear -2.2%, Oxide -2.5%, Vercel -6%, Tailscale -1%. For Newsreader at display size, -1% to -2% is the sensible range; -6% suits a grotesk and would clog a serif. Weight: Linear 510, Vercel 400, Oxide 400, Tailscale 500. A serif H1 at 400-500 matches these.
- **Product shown as artifact.** Stripe Press and Teenage Engineering show the object with minimal UI. Personaudit's equivalent is the paper report. A real photographed or scan-style printed report page, or a faithfully typeset sheet that stays paper in dark mode, would be this move.
- **Color restraint.** Vercel, Oxide: one neutral family, one action color. Personaudit's navy + red + amber is already small; the weak part is amber highlighter plus amber severity (Serious) sharing a hue.
- **Motion.** Not captured (reduced motion forced). Oxide's connector line and Stark's animated chart would need a live capture. [gap]
- **Accessibility-brand trust pattern.** GOV.UK's "tested, with notes" convention is the credibility device; Personaudit can match it by publishing its own axe result and a dated accessibility statement (already linked in the footer).
- **Grid.** Vercel and Oxide use a wide, left-aligned asymmetric grid; Personaudit's 2-column heading-left/content-right is the same family. The difference is rhythm: they vary section types, which is the issue in section 1.

### Gaps
- Not viewed: Linear, Raycast, Basecamp, HEY visuals (typography measured only). Stark H1 not painted at capture time. Motion for all sites.
- I did not capture below the fold on any reference site.

## 3. Curation galleries: specific reference pages

### Takeaway
Galleries gave category entry points more than individual hits: several (godly, Refero, SaaSFrame) are JS-driven or gated, and one redirected. The useful result is a short list of dev-tool, pricing, changelog and security-page reference URLs plus Typewolf pairing evidence that validates serif + sans + mono on a dev product.

### Cited Findings
- godly.website now redirects to https://recent.design/?ref=godly ("Recent, Design Inspiration"); its feed is mostly brand posters, motion studies and OG images, not product sites. [observed, final URL after navigation]
- Land-book pricing pages category: https://land-book.com/design/pricing-page (examples listed include Frontify, Jasper, Mixpanel, Coder "Cloud Development Plans & Pricing" https://land-book.com/websites/84180-cloud-development-plans-and-pricing-coder, Mercury, Monarch Money). Filter bar offers Industry, Style, Type, Typography, Color. Case Study category: https://land-book.com/design/case-study. [observed]
- Lapa Ninja Development Tools landing pages (239 listed): https://www.lapa.ninja/category/development-tools/ ; entries include Vercel, VoidZero, Mintlify, Greptile, Evil Martians, Motion, ReadMe, Linear, Factory (links like https://www.lapa.ninja/post/mintlify-2/, https://www.lapa.ninja/post/greptile/). Also a Typography category (712) and Minimal (3,051). [observed]
- SaaSFrame categories with counts at fetch: Security Page 28 https://www.saasframe.io/categories/security-page ; Changelog 15 https://www.saasframe.io/categories/changelog ; Documentation 38 https://www.saasframe.io/categories/documentation ; Pricing Page 211 https://www.saasframe.io/categories/pricing-page ; Developers Page 7 https://www.saasframe.io/categories/developers-page ; Comparison Page 55. The item list on those pages loaded the same default 30 names in my scrape (Tines, Cloudflare, Hugging Face, Claude, Unkey, Paddle...), so I could not confirm which products belong to which category. [observed; per-category membership unverified]
- Refero (https://refero.design/) is a web-app screen library with "Dashboard Screens", "Dialog & Modal" and "Testimonials" filters and an MCP connector; search results need an account for detail. [observed, partial]
- siteinspire (https://www.siteinspire.com/) has a Typographic category (2,105), Minimal (847), Grid Layout (672): https://www.siteinspire.com/websites/category/typographic . Direct HTTP fetch returned 429 but a browser load worked. [observed]
- One Page Love (https://onepagelove.com/) loads a Sections index https://onepagelove.com/sections and genre filter "SaaS" https://onepagelove.com/genre/saas . minimal.gallery loaded a single item in the HTTP fetch. [observed, thin]
- Typewolf Site of the Day (https://www.typewolf.com/site-of-the-day) shows most recent entries dated Dec 2025 with font pairings, including Speakeasy (a developer-tools site) using Tobias (serif) + Diatype + Diatype Mono (https://www.typewolf.com/site-of-the-day/speakeasy), Every using Signifier + Switzer (https://www.typewolf.com/site-of-the-day/every-2025), Daylight using Grenette + Styrene (https://www.typewolf.com/site-of-the-day/daylight-health), Dirty Vine using Swear + DM Mono (https://www.typewolf.com/site-of-the-day/dirty-vine). [observed; note the archive page may lag current date]
- Typewolf's "40 best Google Fonts" list includes IBM Plex Sans, Source Serif Pro, Lora, Spectral, Fraunces: https://www.typewolf.com/google-fonts . There is no Typewolf page for Newsreader (https://www.typewolf.com/newsreader returns 404). [observed]
- Prior session inspo MCP hits remain the best audit-adjacent finds: Agentcard changelog (https://www.agentcard.sh/updates), Daybridge changelog (https://daybridge.com/changelog), Gwern (https://gwern.net), Anytype pricing (https://anytype.io), Glyphs buy page (https://glyphsapp.com/buy), Loops (https://loops.so), Resend (https://resend.com), Hex (https://www.hex.tech). [sourced from `design_inspiration.md`]

### Inferences
The 20 reference pages to open when briefing a designer, with what to take (V = viewed this session, M = measured only, P = from prior note, U = URL only, not opened):
1. https://press.stripe.com/ (V): product as faithful physical artifact, no UI chrome.
2. https://oxide.computer/ (V): `FIG. 1` boxed caption, terminal panel with connector line, uppercase mono labels.
3. https://vercel.com/ (V): one hero object, two buttons, no gradients; restraint benchmark.
4. https://www.a11yproject.com/ (V): committed serif and a diagram annotation ("11 characters" bracket) as the signature device.
5. https://design-system.service.gov.uk/ (V): research and testing notes as credibility; plain blue band; left-aligned H1.
6. https://www.deque.com/ (V): what to differentiate from (highlighter, cream, pill CTAs).
7. https://www.getstark.co/ (V): product-fragment chips (Violations / Potential / Passed) as hero language; contrast to Personaudit's paper.
8. https://teenage.engineering/ (V): spec-sheet mono labels, line icons, photography-only restraint.
9. https://tailscale.com/ (V): warm off-white + near-black pill CTA; capability tile row.
10. https://linear.app/ (M): type ladder and spacing, not the glows.
11. https://www.speakeasy.com/ (U; Typewolf SOTD entry): serif + grotesk + mono on a developer tool.
12. https://www.agentcard.sh/updates (P): changelog ledger, outlined mono tags; model for "Field guides" and report revision history.
13. https://daybridge.com/changelog (P): collapsible Improvements/Fixes groups; model for severity-grouped findings.
14. https://anytype.io (P) and https://glyphsapp.com/buy (P): ruled-row pricing and a single contrasting band for the paid plan.
15. https://gwern.net (P): footnote/sidenote culture for WCAG citations.
16. https://land-book.com/design/pricing-page (U): pricing comparisons incl. Coder, Mercury.
17. https://www.lapa.ninja/category/development-tools/ (U): Mintlify, Greptile, ReadMe, VoidZero dev-tool landing pages.
18. https://www.saasframe.io/categories/security-page (U): trust and security page patterns; verify membership before relying.
19. https://www.siteinspire.com/websites/category/typographic (U): type-led layouts.
20. https://accessibility.build/sample-audit-report (V as text, see section 4): table-plus-card findings.

### Gaps
- Only top-of-gallery listings were read; I did not open and screenshot the individual gallery picks (items 11, 16-19 are URL-only). Godly is effectively replaced by recent.design.
- Mobbin and Awwwards were not visited this round.

## 4. Report and document design references

### Takeaway
A credible "paper" sample report has a stable skeleton: scope, test environments, method and limitations, severity definitions, summary counts, then a findings table with ID, severity, WCAG criterion and location, with reproduction and fix per finding. Personaudit's sample already has most of this; what is missing is the physical document layer (pagination, cover, sign-off) and a downloadable PDF built from the same data.

### Cited Findings
- accessibility.build sample WCAG 2.2 audit report (fictional checkout): sections Scope, Test environments (browsers plus screen readers, zoom to 400% and reflow at 320px), Limitations ("Conformance cannot be claimed from a sample..."), Methodology (manual testing, axe-core "used only to surface candidates"), Report summary (8 findings, 4 blocking, 14 WCAG criteria affected), severity distribution with a plain-language definition per level (Critical = "Blocks a disabled user from completing the task. No workaround."), and a table of columns ID (NS-001), Issue, Severity, Level, WCAG criteria (with names), Location; table/card view toggle; Excel export. [https://accessibility.build/sample-audit-report, fetched in browser mode]
- W3C WAI "Template for Accessibility Evaluation Reports" points to the WCAG-EM Report Tool, which can generate and download an HTML report. [https://www.w3.org/WAI/test-evaluate/report-template/ (search snippet; page fetch timed out)]
- A PDF sample "Document Accessibility Test Report Summary" exists from Skynet Technologies for WCAG 2.2 AA. [https://www.skynettechnologies.com/sites/default/files/Sample-Accessibility-Audit-Report-2.2.pdf (search snippet only; not opened)]
- GDS publishes monitoring reports on public sector accessibility and a "GDS Way" accessibility statement. [https://www.gov.uk/government/publications/accessibility-monitoring-of-public-sector-websites-and-mobile-apps-from-2022-to-2024/accessibility-monitoring-of-public-sector-websites-and-mobile-apps-from-2022-to-2024 ; https://gds-way.digital.cabinet-office.gov.uk/accessibility.html (search snippets only)]
- Searches for TPGi, Level Access and Intopia sample reports, and for VPAT/ACR examples, returned irrelevant results (a news site and a recipe blog). [observed; no usable result]

### Inferences
What the Personaudit sample report should look like as paper:
- A sheet that is paper in both themes. In dark mode, the page is dark but the report sheet stays warm paper (like a PDF in a viewer). That fixes the dark-card weakness and carries the concept into the first-impression theme.
- Page furniture: cover block (title, client, prepared by/for, date, engine version, scope) then page header and "Page 1 of N" footer in mono, doc number in the corner (the existing PA-0426-NN device is correct here, as a real document number).
- Severity definitions row (borrow accessibility.build's one-line definitions) so Critical/Serious/Moderate/Minor are legible without color; keep text labels with icons.
- Findings as a table on desktop (ID, rule, severity, WCAG SC, state) and cards on mobile; keep per-finding fix and "found at" provenance.
- "Limitations" in the body, not the footer. The existing "Method & limitations" is good and matches the sourced pattern.
- A downloadable PDF and CSV from the same data, plus a print stylesheet. Not tested whether one exists.
- Exhibit/lab-report aesthetic: monospace measurements, figure captions, margin notes. Only the existing stamp-like tab is present; I did not capture legal-exhibit or lab-report references beyond the Oxide figure caption.

### Gaps
- No real agency PDF (TPGi, Level Access, Intopia) or VPAT/ACR was reached. Needs a manual search or a request. The Skynet PDF and W3C tool pages were not opened.
- No legal-exhibit or lab-report aesthetic sources found.

## 5. Grader and score-page analogues for /grade

### Takeaway
All the established graders share one shape: a big grade or score tile, a metadata strip, a pass/fail checklist with text and icon, expandable detail, a permalink, and a rescan control. The best ones add scan history and a "since last scan" delta. Personaudit's /grade is currently a form plus explanation; the result page is where the design needs to carry the product.

### Cited Findings
- Security Headers (https://securityheaders.com): green header band, scan input, then "Security Report Summary" with a large square letter tile (A) at left and a key/value table (Site, IP Address, Report Time, Headers as green check pills, Warning, Advanced upsell); separate Warnings and Raw Headers panels below. Note "Grade capped at A, please see warnings below". [observed, `ref-secheaders-fold.png`]
- MDN HTTP Observatory (https://developer.mozilla.org/en-US/observatory/analyze?host=mozilla.org): "Scan summary: mozilla.org -> www.mozilla.org"; letter tile B+ with Score 80/100, Scan Time "12 hours ago", Tests Passed 11/12, "since last scan" improvement arrow, Rescan and "Scan another website"; tabs: Scoring, CSP analysis, Cookies, Raw server headers, Scan history, Benchmark comparison; table columns Test, Score (-20 with an X), Reason, Recommendation. [observed, `res-observatory.png`]
- internet.nl (https://internet.nl/site/mozilla.org/): headline "67%" in a segmented 20-cell progress bar, then a list of categories each with an icon AND text outcome (red cross: IPv6 / DNSSEC / HTTPS; orange: recommended options; green: RPKI), a permalink with UTC timestamp, "Seconds until retest option: 197", expandable "Show details" rows with per-item shield icons. [observed, `res-internetnl.png`]
- Qualys SSL Labs (https://www.ssllabs.com/ssltest/analyze.html?d=mozilla.org&hideResults=on&latest): "SSL Report: mozilla.org", "Assessed on" timestamp, per-server rows each with a grade (A, A), "Clear cache", "Scan Another >>"; the full text report is long. Text read; screenshot saved but not viewed. [observed, `res-ssllabs.png`]
- PageSpeed Insights (https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fexample.com%2F&form_factor=desktop): "Report from Oct 10, 2026, 12:06:52 PM", "Copy Link" in the header, Mobile/Desktop tabs, "Core Web Vitals Assessment: Passed", each metric as a value with a threshold bar and marker, score gauges (100, 96, 100, 80 circular), a stable analysis URL `/analysis/https-example-com/<id>`. [observed, `res-pagespeed.png`]
- Lighthouse converts each raw metric to a 0-100 score using a log-normal distribution derived from real-world data. [https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/]
- SSL Labs rating methodology is documented in a public guide. [https://github.com/ssllabs/research/wiki/SSL-Server-Rating-Guide (page body not returned in my fetch)]
- WebPageTest landing: Inter 52px/700 on dark `rgb(40,40,40)`; result page not captured. [observed]

### Inferences
Concrete patterns for /grade results, ranked:
1. **Grade tile + key/value strip** (Security Headers, Observatory): letter in a large square set in Newsreader, with Site, Scanned (UTC), Pages reached 7/10, Engine axe-core 4.13.0 beside it. Pairs with the existing Exhibit idea as "the cover sheet".
2. **Text plus icon plus color for every outcome** (internet.nl): never color alone; each row says "Failed", "Needs review", "Passed".
3. **Tabs for depth** (Observatory): Findings, Pages, Method, Raw JSON. Keeps first screen short; the tablist must be keyboard operable with correct ARIA.
4. **Permalink + timestamp + Copy link** (internet.nl, PageSpeed): the share link is the viral object for agencies. Show "Copy link" and "Download PDF" at the top, a "Scanned 2026-10-10 16:00 UTC" line, and a visible expiry policy if links expire. Note the existing `pa.gradeTokens.v1` localStorage key stores tokens (observed); whether results have shareable URLs was not checked.
4b. **Rate-limit honesty** (internet.nl "Seconds until retest option"): show when a re-grade is allowed.
5. **Delta and history** (Observatory "since last scan", Scan history tab): once a site has two grades, show "B to A, 3 fixed, 1 new".
6. **Explain the grade rule** (Observatory score table with -20 per failed test, Lighthouse scoring doc): a "How this grade is calculated" disclosure with the exact weights. The existing site copy says the grade is deterministic; show the arithmetic.
7. **Avoid**: Security Headers' full-bleed green hero and Snyk upsell, WebPageTest dark console look, circular gauges as the primary encoding (color-only risk). Use letter + count.

### Gaps
- /grade result page itself not captured (Turnstile blocks headless; no form submitted). Recommendations assume the current results markup is unseen.
- Lighthouse report viewer, WebPageTest results and Mozilla's Observatory scoring page were not reached (the scoring doc URL I tried returned 404).

## 6. Refined recommendations

### Takeaway
Keep Direction A (Paper Ledger) from the prior note and treat the light theme as the design master. The additions from this round: the paper report sheet persists in dark mode, the exhibit label is rationed to evidence sections, the highlighter is differentiated from Deque, and /grade results are designed as a cover sheet using established grader patterns.

### Inferences (art direction and per-page changes)
Art direction: Paper Ledger, light first. Oxide supplies the figure-caption and mono-label discipline; Stripe Press supplies "the product is the object"; GOV.UK supplies the documented-and-tested credibility. Reject Direction B (acid green on black is the documented second-wave default and Oxide's execution is far deeper than a skin) and keep only one handwritten-adjacent mark (a redline) from Direction C.

Per page:
- **Home** (5,351 desktop, 8,691 mobile): keep hero sheet; add boxed `FIG. 1` caption. Make Exhibit B (procedure) a full-width mono terminal band with no tab scaffold, and turn Exhibit C into a single-column essay with a sidenote, so no three adjacent sections share a layout. On mobile, collapse B's four steps behind disclosure, aiming under 6,000px.
- **/pricing** (6 exhibits): cut to three labeled exhibits (Plans, Compare, Alternatives). FAQ and "Before you pay" become plain headings. Set prices in Newsreader numerals large; keep the ruled rows. Add an "as of" date inside the comparison table caption.
- **/grade**: keep the form page short (good at 2,422px). Design the result as a cover sheet (tile, strip, tabs, permalink) per section 5.
- **/sample-report**: paper sheet in both themes, page furniture, severity definitions, PDF/CSV from the same data (section 4).
- **/for-agencies** (5,662 / 8,615): unchecked in detail; apply the same scaffold rationing and reduce mobile height.
- **Global**: fix CSP `unsafe-inline` (securityheaders warning), raise 8.5-11px real labels to 12px, keep the 2px/4px-offset focus ring (it is good), publish the site's own axe result with a date.

Signature moves (pick two, as before):
1. **The paper that never goes dark**: report sheet and hero sheet stay paper in dark mode. Cheap, ownable, fixes the biggest weakness.
2. **Redline correction**: replace the highlighter on at most one headline with a struck phrase plus red correction (works as the "Grade" to "fix first" story), used once per page. Differentiates from Deque.
3. **Figure captions**: `FIG. 1` on the hero sheet and `FIG. 2` on the crawl map (Oxide precedent).

### Prioritized list
1. Make the sample-report sheet stay paper in dark mode and add document furniture (cover block, running header, page X of Y, severity definitions); ship a PDF from the same data. Highest impact, fixes the main dark-mode weakness.
2. Design the /grade result as a cover sheet: letter tile + key/value strip, text+icon outcomes, tabs, permalink + timestamp + Copy link, retest timer, "how this grade is calculated". This is where free-tool virality lives.
3. Ration the EXHIBIT tab: label evidence sections only; vary section layouts so no three adjacent sections match. Pricing from six to three.
4. Replace or limit the highlighter (Deque uses the same device); introduce the redline correction once per page.
5. Fix own findings: CSP `unsafe-inline` on script-src; real labels under 12px; confirm site's own axe scan and publish the dated result.
6. Shorten mobile: home 8,691px, pricing 7,783px, agencies 8,615px; collapse procedure and FAQ behind disclosure.
7. Add `FIG. n` captions to the hero sheet and crawl map; tighten Newsreader display tracking to the -1% to -2% range if it is not already.
8. Verify what the theme toggle persists and add an inline no-flash theme script if absent (unverified).
9. Capture the missing evidence: real agency report PDFs, /grade result states, motion on reference sites, and the for-agencies page at mobile reading size.

## Sources
- https://personaudit.com/ (pages: /, /pricing, /grade, /sample-report, /for-agencies)
- https://linear.app/ , https://vercel.com/ , https://www.raycast.com/ , https://press.stripe.com/ , https://oxide.computer/ , https://tailscale.com/ , https://basecamp.com/ , https://www.hey.com/ , https://teenage.engineering/
- https://design-system.service.gov.uk/ , https://design-system.service.gov.uk/get-started/ , https://www.a11yproject.com/ , https://www.getstark.co/ , https://www.deque.com/
- https://securityheaders.com/?q=https%3A%2F%2Fpersonaudit.com&followRedirects=on
- https://developer.mozilla.org/en-US/observatory/analyze?host=mozilla.org , https://internet.nl/site/mozilla.org/ , https://www.ssllabs.com/ssltest/analyze.html?d=mozilla.org&hideResults=on&latest , https://pagespeed.web.dev/ , https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/
- https://accessibility.build/sample-audit-report , https://www.w3.org/WAI/test-evaluate/report-template/ , https://www.skynettechnologies.com/sites/default/files/Sample-Accessibility-Audit-Report-2.2.pdf
- https://recent.design/?ref=godly , https://land-book.com/design/pricing-page , https://www.saasframe.io/ , https://www.lapa.ninja/category/development-tools/ , https://refero.design/ , https://www.siteinspire.com/ , https://onepagelove.com/ , https://minimal.gallery/ , https://www.typewolf.com/site-of-the-day , https://www.typewolf.com/google-fonts
