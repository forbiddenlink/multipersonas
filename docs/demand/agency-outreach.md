# Agency demand campaign — Personaudit

Goal: get real agency yeses (waitlist + replies) before more Phase B infra
(hosted session artifact, Stripe). Target: **10 outreaches in 7 days**, measure
signups on `/for-agencies` and waitlist rows.

Landing: https://personaudit.com/for-agencies  
Owner signal: `/waitlist` (set `ADMIN_EMAILS` on Vercel to your login email).

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

> Hi {Name} — I built Personaudit for agencies juggling many client sites under
> ADA/EAA pressure. It runs axe-core at every state a persona reaches (including
> behind login via CLI), exports a verdicts-only compliance report, and tracks
> projects per client. Not an overlay.
>
> Early access is open: https://personaudit.com/for-agencies
> Curious whether multi-site + client reports would fit how you ship.

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
> enterprise monitor, join early access:
> https://personaudit.com/for-agencies
>
> Happy to jump on a 15-min call and scan one of your staging sites.
>
> — Elizabeth

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
> https://personaudit.com/for-agencies

### B. Small agency owner (5–30 people, WP / Next / Shopify)
> Hi {Name} — when a client asks "are we ADA-safe?", how long does it take your
> team to prove it across every logged-in flow? Personaudit gives you a per-client
> project, tracks defects cleared vs last run, and prints a compliance report you
> can hand the client. Between free DIY scanners and a $25k enterprise monitor.
> Free public scans to try: https://personaudit.com/for-agencies

### C. EAA-facing EU agency (deadline is the wedge)
> Hi {Name} — with the EAA in force, your clients' authenticated flows (not just
> the homepage) are in scope. Personaudit crawls behind-login states with axe-core
> and checks a real-shaped user can finish the task, per client, with a print-ready
> report. Happy to scan one staging site free. https://personaudit.com/for-agencies

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

### What shipped for the demand test (2026-07-29)

- Landing: https://personaudit.com/for-agencies (CI gate section + Projects regression pitch)
- Owner signal: `/waitlist` (requires `ADMIN_EMAILS`)
- Product proof: Projects with new/cleared vs last run; VPAT-lite report export; CLI CI gate
- Templates: LinkedIn DM + email above

**You** still own the 10 outreaches — agents cannot send personal DMs.
