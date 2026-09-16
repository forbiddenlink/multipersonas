# Agency demand campaign — Personaudit

Updated 2026-08-29 to match **ADR 0002**. The ask is now a **paid pre-order**, not a
waitlist signup. A free email cannot fail, so it was not a gate.

Goal: find out whether the agency wedge is real before building the hosted
session-artifact pipeline (ADR 0001).

- **Ask:** $199/mo founding tier, via a Stripe **Payment Link**. No checkout build.
- **Target:** ~15 agencies.
- **Pass:** 2 or more pay. **Fail:** zero pay, and the answer is the product, not the funnel.
- **Also capture, from buyers AND decliners:** how many of their client sites sit behind a
  login (*Auth need*), and whether they would rather run those scans **locally** or hand us
  a session. That second answer decides whether ADR 0001 gets built at all, so do not skip
  it on a no. A "we would never upload a client session" is a finding, not a rejection.

Landing: https://personaudit.com/for-agencies
Checkout: set `NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` on Vercel to the Stripe Payment Link.
Until it is set, the page shows the waitlist form alone and no one can pay.
Fulfilment: manual, `docs/pro-access.md` (`update public.profiles set plan = 'pro'`).
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
