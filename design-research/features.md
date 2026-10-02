# Competitor features (loaded 2026-10-01; nav/headings read from the live pages)

| # | Competitor | Observed features (from the page) | What it does badly |
|---|---|---|---|
| 1 | Deque Axe Platform | Testing + monitoring "in one place", guided tests, scan overview with a score dial, mobile analyzer | Cookie wall covers the hero; generic pastel-shape hero; no way to try without sales |
| 2 | Level Access | AI "planning / design review / code testing / triage" diagram, audits, EAA and ADA kits | Dark glow hero with a neural-net diagram; "Request a demo" is the only action; "80% using AI" stat with no source on the first screen |
| 3 | Evinced | "AI that sees / organizes / compares", mobile and web, easy install | Pure claims; no product UI in the first screen; "Book a demo" only |
| 4 | Siteimprove | URL box ("Score my website") in the hero, checkers by industry/role | Logo wall ("trusted by 5,000+"), scope sprawl (SEO, content, analytics), accessibility is one tab of many |
| 5 | Silktide | Accessibility, SEO, UX, analytics, inspector | Same sprawl; cookie dialog is the first heading in the DOM |
| 6 | accessiBe | Automated AI remediation, expert testing, litigation support, floating accessibility widget | Overlay model: advertises "ADA & EAA compliance" automation, which axe-core cannot prove. We state the opposite. |
| 7 | AudioEye | Free site check, cost calculator, "guaranteed compliance", AI readiness study | Guarantee language, "129,000+ leading brands" counter, dark hero |
| 8 | Pa11y | CLI, dashboard, webservice, CI | Plain and trusted, but no report a client can read and no behind-login story |
| 9 | WAVE | Browser extension, API, AIM report, single-page URL box | One page at a time; no export a client reads; no history |
| 10 | Equalize Digital | WordPress plugin checker, bulk issues | WordPress only; "Used by NASA" badge row |

## Gaps no competitor fills (Personaudit's position)
1. A signed-in crawl whose session never leaves the user's machine.
2. A report designed to be handed to a client, with the agency's name on it.
3. Findings and AI opinion kept in separate documents on purpose.
4. A free grade with no signup, in the first screen (only WAVE and Siteimprove come close).

## Feature candidates ranked by impact on the main action ("grade a URL")
| Rank | Feature | Status |
|---|---|---|
| 1 | URL field and Grade button inside the home hero (posts to the existing `/grade` flow) | buildable |
| 2 | Same slim grade field on `/for-agencies`, `/pricing`, guides (closing band) | buildable |
| 3 | Exhibit index: a sticky "Exhibits" table of contents on long pages (guides, docs, pricing) | buildable |
| 4 | A "case file" progress marker while a grade runs (existing `grade-poll`) | buildable (visual only) |
| 5 | Copy-to-clipboard on every command block | buildable (check existing) |
| 6 | Print stylesheet for guides | buildable |
| 7 | Public changelog / status page | needs-approval (new content and routes) |
| 8 | Hosted behind-login scanning | needs-approval (feature is explicitly not built) |
| 9 | Customer logos and testimonials | rejected (no real data; honesty wall) |
