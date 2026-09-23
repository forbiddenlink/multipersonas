# Agency demand campaign — Personaudit

Updated 2026-09-18 for authenticated Checkout; demand criteria remain **ADR 0002**. The ask is now a **paid pre-order**, not a
waitlist signup. A free email cannot fail, so it was not a gate.

Goal: find out whether the agency wedge is real before building the hosted
session-artifact pipeline (ADR 0001).

- **Ask:** $199/mo founding tier, via authenticated **Stripe Checkout**.
- **Target:** ~15 agencies.
- **Pass:** 2 or more pay. **Fail:** zero pay, and the answer is the product, not the funnel.
- **Also capture, from buyers AND decliners:** how many of their client sites sit behind a
  login (*Auth need*), and whether they would rather run those scans **locally** or hand us
  a session. That second answer decides whether ADR 0001 gets built at all, so do not skip
  it on a no. A "we would never upload a client session" is a finding, not a rejection.

Landing: https://personaudit.com/for-agencies
Checkout: `NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` still controls offer visibility, but the
button now calls `/api/checkout/founding` after sign-in. Configure the server Stripe
variables and webhook described in `docs/DEPLOYMENT.md` before enabling the offer.
Fulfilment: signed webhook updates the buyer's profile; manual support grants remain in
`docs/pro-access.md`. Auth need and local-vs-hosted preference are not collected by the
current authenticated Checkout route; record those answers separately, outside Codex.
Complete the billing gates in `docs/plans/2026-09-18-continuation-review.md` before outreach.
Owner signal: `/waitlist` (set `ADMIN_EMAILS` on Vercel to your login email).

Campaign links — use these exactly so source and campaign appear with each lead:

- LinkedIn: `https://personaudit.com/for-agencies?utm_source=linkedin&utm_campaign=agency-founding`
- Direct email: `https://personaudit.com/for-agencies?utm_source=email&utm_campaign=agency-founding`
- Communities: `https://personaudit.com/for-agencies?utm_source=community&utm_campaign=agency-founding`

---

## Who to contact

- Freelance a11y / web consultants shipping 2–20 client sites
- Small digital agencies (5–30 people) with WordPress / Next / Shopify clients
- EAA-facing EU agencies (deadline pressure is the wedge)

Where: LinkedIn (Agency owners, "web accessibility", "ADA compliance"),
A11y Slack/Discords, Indie Hackers, local chamber / agency Slack, existing
clients if you already ship sites for them.

---

## LinkedIn DM (short)

> Hi {Name}, I built Personaudit for agencies juggling many client sites under ADA/EAA
> pressure. It runs axe-core at every state a persona reaches, exports a verdicts-only
> compliance report, and tracks projects per client. Behind-login scans run in the CLI, so
> a client password never leaves your machine. Not an overlay.
>
> Founding access is $199/mo: https://personaudit.com/for-agencies?utm_source=linkedin&utm_campaign=agency-founding
>
> Even if it's a no, one thing would help me: how many of your client sites sit behind a
> login, and would you rather scan those locally or hand a session to a hosted tool?

---

## Email

**Subject:** Accessibility evidence for every client site — early access

> Hi {Name},
>
> Most scanners check a public URL. The defects that matter — checkout, dashboards,
> authenticated flows — sit behind the login. Personaudit crawls those states with
> axe-core (deterministic) and checks whether a real-shaped user can finish the job
> (task success). Agencies get a per-client project + a print-ready compliance report.
>
> Behind-login stays on your machine via the CLI. Hosted public scans are free to try.
>
> If you ship multiple client sites and need something between free DIY and a $25k
> enterprise monitor, founding access is $199/mo:
> https://personaudit.com/for-agencies?utm_source=email&utm_campaign=agency-founding
>
> Straight about where it stands: hosted behind-login isn't built. That runs in the CLI
> today, which is also why your client's password never touches my servers. Founding
> access is what funds the hosted version, and if I don't build it you get your money back.
>
> Happy to jump on a 15-min call and scan one of your staging sites.
>
> Two questions I'd value even if this is a no: how many of your client sites sit behind a
> login, and would you rather run those scans locally or hand a session to a hosted tool?
>
> Elizabeth

---

## Segment-tailored variants (pick the hook per prospect)

The generic template converts worse than a segment-specific first line. Swap the
opener; keep the link + task-success mechanism. One hook per archetype.

### A. Freelance a11y / web consultant (2–20 client sites)
> Hi {Name} — you audit sites for a living, so you already know axe-core misses
> the stuff behind the login: checkout, account, dashboards. Personaudit runs
> axe at every state a persona actually reaches (behind-login via CLI, creds
> never leave your machine) and exports a verdicts-only VPAT-lite report per
> client. Curious if that'd save you the manual-flow-walk on repeat clients.
> https://personaudit.com/for-agencies?utm_source=linkedin&utm_campaign=agency-founding

### B. Small agency owner (5–30 people, WP / Next / Shopify)
> Hi {Name} — when a client asks "are we ADA-safe?", how long does it take your
> team to prove it across every logged-in flow? Personaudit gives you a per-client
> project, tracks defects cleared vs last run, and prints a compliance report you
> can hand the client. Between free DIY scanners and a $25k enterprise monitor.
> Free public scans to try: https://personaudit.com/for-agencies?utm_source=linkedin&utm_campaign=agency-founding

### C. EAA-facing EU agency (deadline is the wedge)
> Hi {Name} — with the EAA in force, your clients' authenticated flows (not just
> the homepage) are in scope. Personaudit crawls behind-login states with axe-core
> and checks a real-shaped user can finish the task, per client, with a print-ready
> report. Happy to scan one staging site free. https://personaudit.com/for-agencies?utm_source=linkedin&utm_campaign=agency-founding

---

## How to find the 10 (search playbook)

Do NOT buy a list. Find people already talking about the problem:

- **LinkedIn search:** `"web accessibility" agency owner`, `"ADA compliance" founder`,
  `accessibility consultant` + filter People. DM the ones who POST about a11y (warm-ish).
- **EU/EAA angle:** `European Accessibility Act agency`, filter by EU location.
- **Communities (warmest):** a11y Slack (web-a11y.slack.com), r/accessibility,
  Indie Hackers "who's building" threads, agency owners in local chamber Slacks.
- **Warmest of all:** anyone you already ship sites for — offer one free behind-login scan.
- Qualify before DM: they ship ≥2 client sites AND mention compliance/legal pressure.
- Log each: name · segment (A/B/C) · where found · sent date → check `/waitlist` daily.

## Success criteria (decide in 7 days)

| Signal | Kill / continue |
|--------|-----------------|
| 0 waitlist + 0 replies | Revisit wedge (indie founders? different pitch) |
| 3–5 serious replies / waitlist | Continue Projects polish + session artifact |
| 5+ "take my money" | Prioritize Stripe Starter/Agency |

Do **not** build billing until the middle row or better.

## Follow-up protocol

1. Check the owner-only `/waitlist` queue once each business day for seven days.
2. Mark a new lead `contacted` after sending one personal reply. Reply within one business day; do not add them to a bulk sequence.
3. Mark `qualified` only after confirming they ship multiple client sites and have a real accessibility-flow need. Use the submitted note to capture the login/session preference; retain any later conversation notes in your CRM or inbox.
4. Mark `not now` for a clear no, and `converted` only after the Stripe payment and manual Pro fulfilment are complete.
5. At day seven, compare qualified leads and checkout clicks by source before changing the pitch or product roadmap.

---

## Distribution checklist

- [ ] Set `ADMIN_EMAILS=<your-login-email>` on Vercel production
      (`vercel env add ADMIN_EMAILS production` — then redeploy). Without this, `/waitlist`
      shows nothing to anyone (safe default).
- [ ] Post /for-agencies once on LinkedIn (personal, not company spam)
- [ ] 10 personalized DMs / emails using templates above
- [ ] Offer one free CLI behind-login scan as a hook
- [ ] Check `/waitlist` daily for 7 days
- [ ] Note themes from waitlist `note` field into product backlog

### What shipped for the demand test (2026-07-29 → 2026-08-03)

- Landing: https://personaudit.com/for-agencies (CI gate section + Projects regression pitch)
- CI docs: https://personaudit.com/guides/ci-accessibility-gate
- Owner signal: `/waitlist` (requires `ADMIN_EMAILS`)
- Product proof: Projects with new/cleared vs last run; VPAT-lite report export; CLI CI gate
- Marketing instrument gallery grounded in SauceDemo probe (`experiments/net-new-violations`)
- Templates: LinkedIn DM + email above

**You** still own the 10 outreaches — agents cannot send personal DMs.

## Saved-task pilot: test use before expanding the product

Protocol added September 18, 2026, before participant results. This is a behavioral
pilot for the deployed saved-task workflow; it does not replace ADR 0002's paid-demand
gate or establish that hosted authenticated scanning is wanted.

**Decision:** Does saving a concrete task and comparing a retest help a consultant or
agency make a release decision enough that they return to use it?

Start with five willing freelance web/accessibility consultants or small agency owners
who have personally checked a website after a change within the last month. Recruit
from one segment for this first pilot so the result is interpretable. Existing paying
customers and personal acquaintances should be identified as separate cohorts by the
research owner; do not mix their responses into a claim about cold demand.

Run a 20-minute session on Liz-owned synthetic/demo sites. Do not use confidential
client sites, client sessions, actual purchases, or production customer records. Keep
participant identities, contact information, and raw notes outside Codex. Only aggregate
counts and non-identifying issue descriptions belong in this repository.

1. Establish the participant's recent workflow: the last release they checked, what they
   did to check it, time spent, and what triggered a second check. Collect past behavior
   before demonstrating the product.
2. Give them the synthetic site and an outcome to check. Ask them to create a project,
   define a task and distinctive expected text, save it, and start a run. Do not supply
   the exact text or guide clicks unless they get stuck; record assistance separately.
3. Ask what the result establishes and what it does not. They must distinguish an
   observed page condition from human success, a completed transaction, and compliance.
   Record whether they can locate the evidence and choose an actionable next step.
4. Introduce the prepared site change. Observe whether they can retest under the same
   conditions and explain the comparison without help.
5. Leave access available. Within seven days, count a voluntary second session or a
   concrete scheduled evaluation of a Liz-owned/demo site. A prompted same-session
   retest does not count as return usage. Do not infer willingness to pay from praise.

Predeclared continuation criteria (small-sample product decisions, not statistical
proof):

| Measure | Continue threshold | If missed |
| --- | --- | --- |
| Define/save/start a useful task without guidance | At least 4 of 5 | Fix the observed setup obstacle before adding features. |
| Explain the text check's limits and locate evidence | At least 4 of 5 | Correct the misunderstanding before promoting stronger claims. |
| Complete and interpret a comparable retest unaided | At least 4 of 5 | Fix the specific comparison/retest obstacle. |
| Voluntarily return within seven days | At least 3 of 5 | Revisit frequency and value of the job; interviews alone do not justify expansion. |

Track aggregate invited, eligible, attended, setup-unaided, evidence-understood,
retest-unaided, returned-in-seven-days, and paid counts. Record denominators and the
observation window. No-shows are recruitment outcomes; they must not disappear from
invited/attended counts. Missing follow-up is not a return. Payment conversion remains
**at least two actual payments from about 15 appropriate asks**, with one inconclusive
and zero a failed gate, after the documented billing prerequisites pass.

Current participant status: **not recruited or tested by this session**. No invitations
have been sent. Liz must select the participant route and authorize specific recipients
and sending before outbound recruitment. Research sessions require actual participants;
AI-generated feedback and synthetic browser results cannot substitute for them.

Method references: [Maze's task-result analysis](https://maze.co/guides/maze-101-guide/analyze-results/)
separates observed task outcomes from qualitative feedback; [User Interviews' interview
guide](https://www.userinterviews.com/ux-research-field-guide-chapter/user-interviews)
explains combining interviews with observed behavior. The five-person pilot, thresholds,
and seven-day return window above are our hypotheses, not benchmarks from those sources.
