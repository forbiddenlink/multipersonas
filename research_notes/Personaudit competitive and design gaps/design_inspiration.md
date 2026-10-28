# Personaudit design inspiration: craft-driven references, live-site critique, art directions

Snapshot as of 2026-10-10. Live site observed 2026-10-10 (dark render only; Playwright headless, desktop 1440 and mobile 390). Screenshots are in `/Volumes/LizsDisk/multipersonas/.playwright-mcp/` (home-desktop, pricing-desktop, sample-desktop, agencies-desktop, grade-desktop, home-mobile). Playwright refused writes to the scratchpad path (allowed roots were the repo and `.playwright-mcp/`), so they were not saved under scratchpad/design. No repo source files were modified.

Rung labels: [observed] = seen on the live site or in a tool result this session; [computed] = I ran the math (script `/private/tmp/claude-501/-Volumes-LizsDisk-multipersonas/d9bb37ca-34b6-4657-b417-d93759d460f5/scratchpad/design/oklch.py`, own OKLCH-to-sRGB conversion, WCAG relative luminance, so treat ratios as +/-0.1); [sourced] = cited URL; [inference] = my judgment.

## 1. What does the live personaudit.com already do, and where does it still read generic?

### Takeaway
The site is already well past the AI-generated default. It has a committed concept (an audit "case file" with EXHIBIT A-F labels and PA-0426 document numbers), a serif display face, a mono for evidence, a restrained OKLCH palette and a hand-highlighted headline phrase. The remaining generic signals are structural (dark-mode blue-CTA dev-tool defaults, an identical exhibit rhythm on every page, the sample report rendered as a dark UI card instead of a document) rather than decorative.

### Cited Findings
- Type stack in production: headings Newsreader (weight 500, 35.2px at 390px width, `oklch(0.94 0.012 88)`), body IBM Plex Sans (400/500/600), mono IBM Plex Mono (400/500/600). [observed via `getComputedStyle` and `document.fonts` on home page]
- Tokens are OKLCH with a light "paper" theme and a `.dark` theme. Light: `--background oklch(96.7% .013 86)`, `--foreground oklch(22% .025 262)`, `--primary oklch(38% .13 264)`, `--redline/--destructive oklch(50% .19 28)`, `--highlight oklch(92.5% .1 98)`, `--radius .1875rem`, `--shadow-sheet` (a document-sheet shadow). Dark: `--background oklch(17.5% .014 262)`, `--primary oklch(80% .09 258)`, `--redline oklch(72% .15 28)`, `--highlight oklch(48% .12 80)`. Severity tokens exist (`--severity-critical/serious/moderate/minor`) in both themes. [observed, CSS rules read from page stylesheets]
- Contrast of the existing tokens: dark fg on bg 15.9:1, dark muted 7.7:1, dark primary 10.2:1, dark redline on card 6.6:1; light fg 15.7:1, light muted 6.5:1, light primary 9.3:1. All clear AA for body text. [computed]
- Concept execution, home: "EXHIBIT A | WHERE SCANNERS STOP" style section tabs with a rule and "PA-0426-01" at right; hero headline "Grade your client's website. Know what to fix first." with an amber highlighter behind "what to fix first."; a hero-right "CASE PA-0426 / ACCESSIBILITY EVIDENCE" paper sheet showing real critical findings (`select-name`, `button-name`, WCAG 4.1.2) from a real probe of saucedemo.com; a six-state "pull-flow crawl map" with DEFECT tags; a "probe ledger" table of four public apps with public-scan vs states vs net-new counts; copy-able CLI steps. [observed, home-desktop.png]
- Concept execution, pricing: plans are presented as ruled rows rather than three cards; a per-capability comparison table honestly marks hosted behind-login scanning as ROADMAP in red mono; a competitor section cites Pope Tech and Siltkide pricing "as of Oct 2026". [observed, pricing-desktop.png]
- Concept execution, sample report: a bordered "sheet" with CLIENT / PREPARED / SCOPE / ENGINE metadata row, severity count strip (Critical 3, Serious 0...), "Fix first" numbered list, per-finding blocks with rule id, WCAG chip, Fix line and "found at" provenance line, a public-vs-session-only state grid, then a persona replay with an "OPINION · AI" badge and step tabs. [observed, sample-desktop.png]
- /for-agencies: dated-claims panel with footnotes, a client-list table with last-scan status, a "report footer" sample showing white-label line, and a "Join founding access" form. [observed, agencies-desktop.png]
- /grade: input + Cloudflare Turnstile widget. In headless Chromium the submit button stayed "Checking you're human..." (disabled) and the widget showed "Verifying..."; I did not submit anything. Console errors on home are emitted from the `challenges.cloudflare.com` Turnstile frame (font-size:0 log spam, a WOFF2 "OTS parsing error", "No available adapters"), plus five "preloaded but not used" warnings for Next font woff2 files. [observed, console log files `console-2026-10-10T15-55-37-840Z.log`]
- Mobile (390px): `document.documentElement.scrollWidth` = 390, so no horizontal page scroll. The full-page capture is 8,830px tall, i.e. the home page is very long on a phone. I did not inspect individual mobile sections at readable zoom. [observed]
- The mainstream "AI slop" fingerprint per a 2026 write-up: Inter or system font everywhere, indigo-to-purple gradient (including on headline text), centered hero + pill badge + two buttons + logo row + three rounded feature cards, uniform rounded-2xl card kit with the same soft shadow, reflexive glass blur, same fade-and-slide-up on every section, count-up stats, filler copy and invented metrics. [Capital & Compute, "How to Fix AI Slop in Web Design, Tell by Tell", 2026-09-25](https://capitalandcompute.net/blog/fix-ai-slop-design/)
- The same piece says that banning purple pushes agents to a "second wave" of defaults (warm cream with terracotta; near-black with one acid-green highlight) and cites an Anthropic frontend-design skill update on 2026-09-03 naming those as tells, including terracotta near `#D97757`. I could only verify this through the blog post, not through Anthropic's skill file. [Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/)
- Origin of the purple default is attributed to Tailwind UI's `bg-indigo-500` (Adam Wathan apology, Aug 2025). Single secondary source. [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
- Guiding principle quoted there: a tell "is evidence of a default nobody chose, never proof that a model made the page." [via Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/)

### Inferences
Honest critique against the six listed tells:
- Gradient blobs / purple: absent. No gradient text. Good. Primary is a cool periwinkle blue, which is the dev-tool default CTA color, but it is used sparingly.
- Centered hero + three feature cards: absent. The hero is left-aligned with a live artifact on the right. Good.
- Uniform rounded cards: absent (radius is 3px, ruled rows, tables). Good.
- Inter everywhere: absent (Newsreader + Plex). However IBM Plex Sans body + Plex Mono is a very common "technical but humane" pairing in 2026; it reads chosen, not default, but not rare.
- Emoji icons, fake testimonials, invented metrics: absent. The probe ledger uses real numbers with a source link. Strongest trust asset on the site.
- Identical section rhythm: PARTIAL FAIL. Every section on home, pricing, grade and agencies opens with the same EXHIBIT tab + rule + document-number strip, then a 2-column heading-left / content-right layout, then a hairline. The system is the brand, but at six repeats per page it becomes a template. The home page has no section whose layout breaks the grid.
- Dark-only first impression: all captures rendered dark. A dark UI with periwinkle CTA and amber highlight is the other common "dev tool" look. The light "paper" theme (which the tokens define) is the more distinctive expression of an audit document and I did not capture it. Unknown which theme a first-time visitor gets.
- Sample report is shown as a dark card inside a dark page, so it does not feel like a deliverable. A real audit document would be a white or paper sheet that visibly differs from the app chrome.
- Page length on mobile (8,830px) and 6 exhibits per page is a long scroll for a CLI-and-grade product.
- "PA-0426" doc numbers are a good fiction device, but "0426" appears to be a fixed string (month-year style) on every page including the footer "END OF FILE"; on a page dated Oct 2026 it may read as stale or arbitrary. UNVERIFIED which meaning it has; ask the owner.

### Gaps
- Light theme and default theme selection not captured (headless prefers-color-scheme unknown). Needs a capture with `prefers-color-scheme: light` and the theme toggle.
- Mobile sections not reviewed at readable resolution; only height and overflow measured.
- Authenticated app (dashboard, project pages, settings) not reviewed: requires a login. Task 3 listed only public pages.
- Did not check keyboard focus rings, reduced-motion behavior or run the site's own axe scan against live pages.

## 2. Inspo MCP reference screens (task 1)

### Takeaway
The inspo archive has no audit-report-viewer or score-page references. Its useful hits are: long-document/changelog layouts for the report, ruled-row pricing, and editorial-serif dark dev-tool sites. The category's strongest pull is grotesk sans display type (83% of 24 measured sites), so Personaudit's serif display is already "against the gravity."

### Cited Findings
- `recommend` for "accessibility and UX audit tool ... audit report aesthetic" returned Split Studio macrostructure; measured genre: light paper band 54%, grotesk-sans display 83%, cool accent 54%; outliers unkey-com and nuxt-com (dark, chromatic), geex-arts-com (light, roman serif). [inspo `recommend`, tool result]
- `agentcard-sh--updates` (https://www.agentcard.sh/updates): changelog as a dated ledger. Left date column ("MON SEP 07"), small outlined mono tags "ADDED" / "FIXED", a mono status line "SHIPPING DAILY · LAST ENTRY ...". Fonts Geist Pixel Square, Geist Mono, Geist Sans. Borrow: severity chips as outlined mono tags and a mono metadata line under headings. [inspo screen]
- `daybridge-com--changelog` (https://daybridge.com/changelog): date block at left, platform filter row, collapsible "Improvements 6 / Fixes 2" groups under each entry. Borrow: collapsible per-severity groups in findings lists and a filter row (state / severity / status). [inspo screen]
- `localcan-com--docs` (https://www.localcan.com/docs): left nav with section groups, numbered green step badges, inline code chips, large light-weight H1. Borrow: numbered step list with inline mono commands for CLI docs. [inspo screen]
- `gwern-net--doc-ai-index` (https://gwern.net): Source Serif 4 + Source Sans 3, dense link lists with small icons, the document-first end of the spectrum. Borrow: footnote and sidenote culture for the WCAG citations. [inspo screen]
- `loops-so` (https://loops.so): Newsreader serif display with underlined link words in the headline, Human/Agent toggle with a token panel. Same display serif as Personaudit; useful proof that a serif H1 works on a dev-tool. [inspo screen]
- `anytype-io--pricing` (https://anytype.io): large serif "Pricing" with a vertical hairline divider between plans, not cards. Closest to Personaudit's existing ruled pricing. `glyphsapp-com--buy` (https://glyphsapp.com/buy): full-width colored bands per product, each with a solid buy button. Borrow: a single high-contrast band for the paid plan rather than a "Most popular" badge. [inspo screens]
- `inkandswitch-com` (https://www.inkandswitch.com): white line-art on charcoal, Merriweather serif; evidence-of-craft through bespoke linework instead of photography. Borrow: line-drawn annotated figures. [inspo screen]
- `resend-com` (https://resend.com): dark, display face "domaine" (a serif) at large size with A BCFavorit and Inter UI, subtle light-streak background; one of the most cited dark+serif dev tool pages. `railway-com` (https://railway.com): IBM Plex Serif + Inter, product screenshot in a faux-OS frame with real-looking incident card ("High CPU Usage"). Borrow: show a real finding in the hero, which Personaudit already does. [inspo screens]
- `posthog-com` (https://posthog.com): deliberately quirky (hedgehog illustration, OS-window chrome, a cookie banner joke); fonts "RoundHog". `sentry-io` (https://sentry.io): purple, illustrated monster mascot, "Wake up babe" headline; fonts Dammit Sans + Rubik. Both show personality through illustration and tone, a lane Personaudit should NOT copy (conflicts with a trust/audit voice). [inspo screens]
- `hex-tech` (https://www.hex.tech): serif-italic + extended-grotesk headline mix over notebook-style product screenshots. Borrow: italic serif for the one emphasized phrase instead of a highlighter on every page. [inspo screen]
- Linear design system (Inspo extraction, captured 2026-05-04): Inter Variable, h1 64px weight 510 line-height 1 letter-spacing -1.408px; 4px base spacing; radii 0/2/4/6/50px; mono "Berkeley Mono"; accent `#7170ff`. [inspo `get_design_system` linear-app](https://inspomcp.dev/d/linear-app/DESIGN.md)
- `get_site_pages` and `find_reference_components` were not called; reference components for split-screen hero exist (`split-screen`, type hero). [inspo `recommend` result]

### Inferences
- Nothing in the archive resembles a score/grade results page or a severity-sorted issue list; those references must come from outside (Lighthouse report, Sentry issue list, a school report card, a credit report). I did not capture those this session.
- The strongest transferable structure for a report viewer is the changelog ledger: date or ID gutter at left, mono chips, collapsible groups.

### Gaps
- No inspo hits for empty states, issue lists with severity, or dashboards with trend history. Searched "dashboard analytics trend history chart scores over time" and got only NYT, Hex, Pusher, Coda, Dovetail marketing pages, not usable dashboards.
- Mobbin, Refero, godly.website, land-book, SaaSframe, Lapa Ninja, Awwwards, siteinspire, minimal.gallery, One Page Love and Typewolf were NOT browsed (Firecrawl returned "Insufficient credits" for every scrape and was rate limited; time budget spent on the live-site capture and inspo). Treat curation-site coverage as zero.

## 3. Craft-driven reference sites (task 2): what each is known for and what to borrow

### Takeaway
The distinctive sites each commit to one idiosyncratic device (Oxide: terminal/ASCII language in a custom mono; Resend: serif display on near-black; Linear: tight type ramp and restraint; PostHog: illustration and humor; GOV.UK: tested components and plain language). For Personaudit the transferable lesson is commit to the "document" device and let the product artifact do the talking, not to add personality layers.

### Cited Findings
- Oxide's identity by Pentagram: inspired by text-based UIs, CLIs and ASCII art with "a subtle DIY gaming and retro computing vibe"; logo uses a slashed zero and a multiplication sign (hexadecimal reference); the team and Grilli Type built an extended character set into a custom cut of GT America Mono so the font serves both typography and real-time illustrations on the site; ASCII-inspired grid patterns also appear on the hardware. [Pentagram, Oxide](https://www.pentagram.com/work/oxide/story). A second search result states the primary typeface is Neue Haas Grotesk with GT America Mono for diagrams and UI; and a green/red/blue/yellow on black palette (search snippet of the Pentagram page; I did not read that sentence on the fetched page itself, so treat as secondary).
- Linear: Inter Variable at 64px/510 weight, line-height 1.0, -1.4px tracking; base 4px spacing; max width 1440px; accent `#7170ff`; muted text steps `#d0d6e0`, `#8a8f98`, `#62666d` on near-black. [Inspo extraction](https://inspomcp.dev/d/linear-app/DESIGN.md)
- GOV.UK Design System: every style, component and pattern ships with notes on how and when it was tested in user research, and a GitHub discussion link for findings. [GOV.UK Design System, Get started](https://design-system.service.gov.uk/get-started/)
- The A11Y Project's brand palette extraction returned `#00260f`, `#f937fd`, `#582b62`, `#a731ae` (a very dark green and magenta/purple). Extraction heuristic only; fonts not detected. [wigolo brand extract of a11yproject.com](https://www.a11yproject.com/)
- Plausible palette extraction: `#acafd4`, `#6367bd` (indigo family). Heuristic only. [wigolo brand extract of plausible.io](https://plausible.io)
- Resend (via inspo): display face "domaine" serif, UI in A BCFavorit and Inter, dark with accent `#47b7a7`. Railway: IBM Plex Serif display. Sentry: purple, Dammit Sans and Rubik. Supabase: Manrope, green `#4cce93`. PostHog: RoundHog, teal/yellow. [inspo screens, section 2 slugs]
- Newsreader (Production Type, Hugues Gentile, commissioned by Google Fonts) is SIL OFL 1.1, variable with weight and optical size axes. [Production Type](https://www.productiontype.com/news/new_fonts_from_production_type_newsreader); license summary [openfontlicense.org](https://openfontlicense.org/ofl-fonts/). Axis ranges disagree between secondary sources (200-800 vs 100-900); check the Google Fonts page.

### Inferences
Per-site borrow list (from my knowledge plus the evidence above; sites not fetched this session are marked "not re-read"):
- Linear (partly read via inspo): restraint, tight negative tracking at display sizes, a muted-text step ladder. Do not copy the dark-glow gradients.
- Vercel, Raycast, Stripe, Cal.com, Clerk, Supabase, Tailscale, Railway, Sentry (not re-read): their shared 2024-2026 trait is product-UI-as-hero; Personaudit already does this with a real defect sheet.
- Resend: proves a serif display works on a dark dev-tool page; keep.
- PostHog / Sentry: personality via mascot illustration. Wrong register for an audit tool; one small hand-made device (a stamp, a highlighter) is the equivalent.
- Plausible / Fathom (not re-read): single-page transparent pricing and "public dashboard" demo; borrow a live public demo report (Personaudit's sample report is that).
- Oxide: the closest conceptual relative: a whole visual language derived from the product's native medium. Personaudit's native medium is the audit document; keep pushing paper, stamps, margin annotations, document IDs.
- Basecamp/HEY, Arc/The Browser Company, Teenage Engineering, Readymag, Mailchimp (not re-read): borrow irreverent specificity in copy and one memorable physical metaphor each; Teenage Engineering's product-spec-sheet aesthetic fits an audit-sheet metaphor.
- GOV.UK / WebAIM / a11yproject / Stark / Deque / Adrian Roselli (largely not re-read): the accessibility-native brands are visually plain on purpose; credibility comes from tested components, plain language, dated corrections and citations. Personaudit should show its own accessibility statement prominently and publish its own axe results (it already links an "Accessibility statement").

### Gaps
- Not fetched this session (Firecrawl out of credits): Vercel, Raycast, Stripe, Sentry, Cal.com, Clerk, Supabase, Tailscale, Basecamp/HEY, Arc, Teenage Engineering, Readymag, Mailchimp, Stark, Deque, WebAIM, Adrian Roselli. Statements about them above are general knowledge, not cited findings.
- Fonts for Plausible, a11yproject, GOV.UK not detected by the extractor (provenance "unknown"). GOV.UK's real type (GDS Transport / system Arial fallback) not verified here.
- Curation galleries (godly, land-book, SaaSframe, Lapa Ninja, Mobbin, Refero, Awwwards, siteinspire, minimal.gallery, One Page Love, Typewolf) not browsed.

## 4. Art directions for Personaudit (task 4)

### Takeaway
Three directions, all of which keep the existing "case file" concept and the OKLCH token architecture, and differ in how far they push it: (A) Paper Ledger, a light-first refinement; (B) Terminal Exhibit, an Oxide-style mono-led dark system; (C) Marked-Up Proof, an editorial redline treatment. Recommended: A as the base, with one sheet-style moment borrowed from C.

### Cited Findings
- Contrast ratios below are computed by me for proposed tokens ([computed], approximate); the existing site tokens in section 1 are measured from the live CSS.
- Fonts' licenses: Newsreader SIL OFL 1.1 [Production Type](https://www.productiontype.com/news/new_fonts_from_production_type_newsreader). IBM Plex Sans/Mono and Source Serif 4 / Source Sans 3 are on Google Fonts under OFL per my knowledge; I did not fetch their license pages this session. GT America Mono and Neue Haas Grotesk (Oxide) are commercial per my knowledge, not verified.
- Gwern uses Source Serif 4 + Source Sans 3; Ink & Switch uses Merriweather; Railway IBM Plex Serif. [inspo screens, section 2]

### Inferences
**Direction A: Paper Ledger (recommended; evolution of the current site)**
- Concept: the site is a bound audit ledger. Light paper default, dark as the "night shift" theme.
- Type: Newsreader (OFL, variable, opsz axis) for display and headings, with `font-optical-sizing: auto`; IBM Plex Sans (OFL) body; IBM Plex Mono for IDs, rule names, commands. Swap the body to Source Sans 3 if a less IBM feel is wanted. Use tabular numerals for counts.
- Color (OKLCH, [computed] contrast on paper `oklch(96.5% .012 92)` = `#f6f3eb`): ink `oklch(21% .02 265)` 16.0:1; redline/critical `oklch(52% .19 32)` 5.5:1 (fine for text >= 14px bold or any 18px+; `oklch(55% .19 32)` is 4.8:1, still AA for body); cobalt link/primary `oklch(42% .15 262)` 7.9:1. Dark theme: night `oklch(16% .02 255)` with ink `oklch(93% .01 92)` 15.8:1 and signal amber `oklch(82% .15 82)` 11.0:1.
- Layout: 12-column grid with a 2-column "gutter" reserved for margin notes (document ID, WCAG criterion, state label), so annotations hang in the margin as on a real audit; text measure 62-68ch.
- Imagery: no stock, no gradients. Real artifacts: annotated cropped screenshots of the defective element with a numbered redline circle and a margin note; the PDF report as a physical-looking sheet (white sheet, `--shadow-sheet`) on a slightly darker page.
- References: Gwern (document typography), Agentcard changelog ledger, Anytype pricing hairlines, Glyphs price bands, Loops/Resend (serif display on a dev tool).

**Direction B: Terminal Exhibit (dark, mono-led)**
- Concept: an evidence console. Everything the scanner emits looks like the scanner's output.
- Type: IBM Plex Mono or JetBrains Mono (OFL, per my knowledge) for display and UI at large sizes, with Newsreader reserved for one pull quote per page. Avoid Berkeley Mono / GT America Mono (commercial; Oxide's choice) unless licensed.
- Color [computed on `oklch(17% .02 160)` = `#08120c`]: bone text `oklch(95% .012 110)` 16.5:1; phosphor green `oklch(85% .19 145)` 12.8:1; amber `oklch(80% .15 75)` 10.0:1; keep red only for Critical to avoid a Christmas-tree palette.
- Layout: strict character grid (ch units), box-drawing rules, ASCII sparkline for score history, dense tables.
- Imagery: ASCII/dither renderings of the crawl map; real CLI session recordings (accessible: provide transcript).
- Risk: "dark + one acid-green highlight" is the second-wave AI default per the Capital & Compute piece. Only viable if the mono language is deeply committed, as at Oxide.
- References: Oxide (Pentagram identity), Ink & Switch line art, Railway faux-OS frames.

**Direction C: Marked-Up Proof (editorial redline)**
- Concept: a copy editor's proof of the client's website. Proofreader's marks (caret, strike, margin comment bubbles) are the illustration system.
- Type: Newsreader italic for annotations, Source Serif 4 or Newsreader for body, Plex Mono for rule IDs; a single handwriting-adjacent face is NOT recommended (accessibility and cliche).
- Color [computed on lemon-tinted paper `oklch(95% .09 100)` = `#fcf1aa`]: ink `oklch(20% .03 275)` 15.8:1; proof blue `oklch(40% .17 268)` 8.4:1; red pencil `oklch(50% .20 28)` 5.8:1. A highlighter-yellow page is bold; verify it does not trip the "cream + accent" second-wave tell and that large yellow areas pass user glare/low-vision checks.
- Layout: screenshots with overlaid redlines, comments in a right rail, page-turn index at left.
- Imagery: SVG proof marks drawn per defect; the "defect overlay" is the hero.
- References: Hex serif-italic emphasis, Daniel Sun/Clerk case-study editorial layout (inspo `danielsun-space--clerk`), Magnum/Ink & Switch for confident negative space.
- Risk: highest effort; easiest to tip into twee.

### Gaps
- No user research or A/B data on which direction converts for agencies.
- Font license pages for IBM Plex, Source Serif 4, JetBrains Mono not fetched; verify before shipping self-hosted files.

## 5. Signature interactions and elements (task 5)

### Takeaway
The memorable, accessible moves are ones where the product's own evidence is the interaction: an annotated defect overlay, a live mini-scan against a bundled fixture page, a persona journey timeline, and a report that is visibly a document. All can be built with real DOM, keyboard operation and `prefers-reduced-motion` fallbacks.

### Cited Findings
- The site already ships a persona replay widget with Previous/Next and step tabs ("IN PROGRESS 1 / 3 steps") and a six-state crawl map with DEFECT tags. [observed, sample-desktop.png and home-desktop.png]
- Principle for what not to add: "motion only in response to a user action", "one orchestrated moment", delete invented numbers. [Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/)

### Inferences
Ranked by impact for effort:
1. **Annotated defect overlay (hero).** A frozen screenshot of a real client-like page with 2-3 numbered redline rings; each ring is a real `<button>` that opens a margin note (rule id, WCAG SC, element selector, fix). Keyboard: Tab through rings in DOM order, Enter/Space toggles, Esc closes, visible 3px focus ring with 3:1 contrast against both ring and page. No hover-only content. Static fallback: the notes list below the image is always visible.
2. **"Run it twice" determinism demo.** Two identical result blocks that show the same hash/counts after "Run again" (client-side replay of stored JSON; no network). Makes "deterministic" tangible. Respect reduced motion (swap, no animation); announce results via `aria-live="polite"`.
3. **Pull-flow crawl map as a scrubber.** The existing six-state strip becomes a horizontal list you can arrow through with a roving tabindex; selecting a state updates the findings panel. Ensure it remains a list/table for screen readers.
4. **Persona journey timeline.** Vertical timeline with friction score per step as a small bar plus a text value, explicitly labeled OPINION · AI (already done). Add a plain-text transcript toggle.
5. **Real-document report.** Render /sample-report as a white sheet with print stylesheet, page numbers, a cover block, "Prepared for / by" lines, severity legend, and a footer "Page 2 of 6". Offer the actual PDF from the same data. This reads as a deliverable instead of UI.
6. **Score history sparkline with a floor line.** In the app: a baseline line ("fail-on serious") and per-scan marks; table alternative below; no gradient fills.
7. **Empty states as blank forms.** "No scans yet" shown as an empty case file with the first line pre-filled `npx personaudit scan https://...` and a copy button.
- Accessibility guardrails for all: contrast >= 4.5:1 text / 3:1 UI (WCAG 2.2 AA 1.4.3, 1.4.11), focus visible and not obscured (2.4.7, 2.4.11), target size >= 24px (2.5.8), no content on hover only (1.4.13), motion gated by `prefers-reduced-motion`, no auto-playing animation > 5s without pause (2.2.2).

### Gaps
- Did not test the existing persona replay and crawl-map components for keyboard and screen reader behavior.
- No evidence gathered on which interactions lift conversion.

## 6. Ready-to-paste image-model prompts (task 6; not generated)

### Takeaway
Image generation should supply texture and non-product art only (paper grain, a stamp, a subtle ledger-line background). Product artifacts must stay real, per the honesty stance already on the site.

### Cited Findings
- None (prompts are my authored drafts).

### Inferences
Use with Magica or Gemini. Keep generated assets decorative (`alt=""`) and under about 150KB; verify text contrast over any texture.

1. Paper texture (light theme background, tileable):
   "Seamless tileable texture of warm off-white uncoated archival paper, extremely subtle fiber and grain, no stains, no wrinkles, no shadows, no text, flat even lighting, neutral warm tone close to #F6F3EB, low contrast, 2048x2048, photographic scan quality."
2. Ledger rule overlay:
   "Seamless tileable pattern of very faint horizontal ledger rule lines and a single faint vertical margin line in pale blue-grey on transparent background, hairline weight, 4% opacity feel, technical document stationery, no text, vector clean."
3. Exhibit stamp:
   "A rubber ink stamp impression reading 'EXHIBIT' in a heavy condensed serif capital, slightly uneven ink, imperfect edge, vermilion red ink (#BE260B) on transparent background, rotated 4 degrees, high resolution, no border box, no extra words."
4. Redline annotation marks sheet:
   "Set of hand-drawn proofreader's marks in red pencil on transparent background: circled number badges 1-5, a caret, a strike-through line, a bracket, a margin arrow; confident single-weight strokes, slightly imperfect, no text other than the numbers, flat, suitable for SVG tracing."
5. Dark theme night-grain:
   "Seamless tileable dark navy-black surface #080E16 with very fine film grain and an almost invisible vignette-free noise, no gradients, no glow, no objects, 2048x2048."
6. Hero side-art (Direction B only):
   "Monochrome ASCII and box-drawing character rendering of a website wireframe being scanned, green phosphor text #72ED7B on near-black #08120C, dense monospace character grid, a few characters highlighted amber, crisp, no blur, no glow, no people, 16:9."
7. Social/OG card background:
   "Flat top-down photograph of a plain white audit report on a dark desk, a red pencil lying diagonally, the page text intentionally blank and unreadable, soft window light, shallow depth of field, no logos, no hands, no brand names."

### Gaps
- Not generated or tested. Magica status: previously noted as "green-but-lying" in the user's rules (connected but auth fails), so confirm it works before relying on it.

## 7. Prioritized recommendations

### Takeaway
Do not redesign. The site already avoids most AI tells. The highest-value work is (1) break the repeated exhibit layout on at least one section per page, (2) make the sample report a real paper document, (3) confirm and decide the default theme, (4) shorten mobile.

### Cited Findings
- AI-tell checklist and the "second wave" warning: [Capital & Compute](https://capitalandcompute.net/blog/fix-ai-slop-design/).
- Document-system precedent: Oxide's identity built from the product's native medium [Pentagram](https://www.pentagram.com/work/oxide/story).

### Inferences
**Must-fix AI-tell and sameness issues**
1. Identical section scaffold (tab + rule + doc number + 2-col) repeated 6 times per page. Keep the tab as a label, but vary layout: make one section full-bleed evidence (a single large annotated screenshot), one a pure table, one a single-column essay with sidenotes. Target: no more than 3 consecutive sections sharing a layout.
2. Dark + periwinkle CTA + amber highlight is the dev-tool default. Capture the light "paper" theme and compare; if it is stronger, make it the default and let dark follow `prefers-color-scheme`.
3. Sample report is a dark card; render it as a white sheet.
4. Resolve what "PA-0426" means or vary it by page date; a fixed unexplained code risks reading decorative.
5. Mobile: home page is ~8,830px tall. Collapse exhibits to summaries with disclosure, or cut one exhibit.

**High-impact upgrades**
6. Annotated defect overlay hero (section 5, item 1).
7. Real PDF-like report with print stylesheet and page numbers.
8. Move the competitor/price claims to a dated, footnoted table with source links (the pricing page already does this; add the "as of" date to the table itself, not just a paragraph).
9. Add visible proof the site passes its own axe scan (a CI badge or a dated line in the accessibility statement).
10. Fix the console noise that is yours: the five unused font preloads (`link rel=preload` warnings). The Turnstile errors come from Cloudflare's frame, not your code.

**Signature moves (pick two)**
- "Run it twice" determinism demo.
- Margin-note layout with hanging WCAG citations.
- Stamped severity (a real stamp asset for Critical, used once per report).

**Do not do**
- Gradient blobs, glass, mascot illustration (PostHog/Sentry lane), count-up stats, invented logos or testimonials, a second font for decoration.
- Do not swap to terracotta/cream or acid-green to "look less AI"; that is the documented second-wave default.

### Gaps
- No quantitative design validation (no usability test, no analytics). Everything above is expert review of screenshots.
- Authenticated app screens were not reviewed.

## Sources
- https://capitalandcompute.net/blog/fix-ai-slop-design/
- https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
- https://www.925studios.co/blog/ai-slop-design-tells
- https://www.pentagram.com/work/oxide/story
- https://design-system.service.gov.uk/get-started/
- https://www.productiontype.com/news/new_fonts_from_production_type_newsreader
- https://openfontlicense.org/ofl-fonts/
- https://inspomcp.dev/d/linear-app/DESIGN.md
- Inspo slugs (screens viewed via the inspo MCP): agentcard-sh--updates, daybridge-com--changelog, localcan-com--docs, gwern-net--doc-ai-index, loops-so, anytype-io--pricing, glyphsapp-com--buy, inkandswitch-com, resend-com, railway-com, posthog-com, sentry-io, supabase-com, hex-tech, danielsun-space--clerk, mux-com, geex-arts-com, svelte-dev, e2b-dev
