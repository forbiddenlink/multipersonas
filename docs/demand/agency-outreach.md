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
- [ ] Post /for-agencies once on LinkedIn (personal, not company spam)
- [ ] 10 personalized DMs / emails using templates above
- [ ] Offer one free CLI behind-login scan as a hook
- [ ] Check `/waitlist` daily for 7 days
- [ ] Note themes from waitlist `note` field into product backlog
