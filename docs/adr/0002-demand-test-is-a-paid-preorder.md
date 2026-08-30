# ADR 0002 — The demand test is a paid pre-order, not a waitlist

Status: Accepted (2026-08-29)
Written against: `0be4387` (main, 2026-08-29)
Amends: ADR 0001's "Validation gate" section, which said only "shows real pull".

## Context

ADR 0001 blocks the hosted behind-login (session-artifact) pipeline behind a demand
test, but specified it as "pre-sell to agencies ... shows real pull". That cannot fail.
Any number of responses reads as pull, so a gate guarding weeks of hosted-auth work was
not actually binding.

What was built against that gate is weaker still: `/for-agencies` carries **no price**
and captures free waitlist emails. Free email measures interest, not willingness to pay.

Two further facts constrain the design:

- `docs/plans/2026-07-27-personaudit-product-design.md:96` — behind-login
  willingness-to-pay is the **least-validated** claim and the core differentiator.
- Hosted behind-login is genuinely unbuilt. `storageState` handling lives only in the
  engine (`src/auth/session.ts`, `src/agent/engine.ts`, `src/crawler/crawl.ts`); there is
  nothing in `web/` or `web/supabase/`. Everything else an agency would buy — multi-site
  Projects, scheduled re-scans, the Report with CSV + print-to-PDF export, the CI gate,
  hosted public scanning — does ship today.

That combination creates the real hazard. Selling the shipped bundle at a price and
getting two buyers would validate *hosted multi-site accessibility reporting*, not
hosted behind-login — and would then be read as clearance to build hosted-auth. The gate
would pass without ever touching the claim it exists to guard. A false pass is worse than
a failed test, because it does not feel like a failure.

## Decision

The demand test is a **paid pre-order at a single founding price**, run against a warm
list, with the unbuilt capability named explicitly in the ask.

- **Price:** $199/mo, one tier. Clear of the axe DevTools $45/mo anchor (so it does not
  read as a scanner), under RAMP's $299 floor (so it occupies the claimed SMB gap).
  Single tier because the sample is too small to split across two offers.
- **Mechanism:** a Stripe **Payment Link**. No checkout build, no billing code.
- **Audience:** ~15 agencies from a warm list.
- **Framing:** an explicit pre-order. The buyer receives every hosted capability that
  exists today, and is told plainly that hosted behind-login does not yet exist, runs via
  the CLI meanwhile, and is what the purchase funds.
- **Pass:** 2 or more pay. **Fail:** zero pay — and the conclusion is the product, not
  the funnel.
- **Segmentation:** record **Auth need** (how many client sites require scanning behind a
  login) from buyers *and* decliners. "We don't audit behind logins anyway" and "$199 is
  too much" are opposite findings that a bare yes/no cannot separate.

## Consequences

Positive:
- The gate can fail, which is the only property that makes it a gate.
- Because behind-login is named as the unbuilt thing being funded, payment prices the
  least-validated claim rather than the shipped bundle.
- Costs roughly nothing: a Payment Link, a price on an existing page, and 15 messages.
- A zero result is a real answer that saves weeks, not an inconclusive one.

Negative / honest risks:
- Money is taken for a capability that does not exist. That obligation is real: it must
  be stated in the ask, and a refund path must exist if hosted behind-login is not built.
- n≈15 with a pass bar of 2 is a small, noisy sample. It is a kill/continue signal, not a
  market size.
- A warm list converts far better than cold outreach, so a pass does not establish that
  the wedge is *reachable* at scale. That is a separate, later question.
- Sourcing the list from an employer's professional network is a real-world judgment call
  about conflict of interest, not a technical one.

## Alternatives rejected

- **Free waitlist email** (what is currently built) — rejected: cannot fail, so it
  launders the decision rather than making it.
- **Stated-price intent without payment** ("would you pay $199?") — rejected: cheap to
  say yes to a hypothetical, and a Payment Link costs nothing extra, so the weaker signal
  buys no savings.
- **Sell only what ships today, say nothing about behind-login** — rejected: honest, but
  measures the bundle. ADR 0001's gate would then have to be rewritten to admit it never
  tested hosted-auth, leaving that build unjustified.
- **Two separate asks (bundle, then behind-login add-on)** — rejected: two questions
  across ~15 contacts splits an already tiny sample and neither result reaches the bar.
- **Build hosted behind-login first, then test** — rejected: inverts ADR 0001 entirely
  and spends exactly the weeks the gate exists to protect.

## Follow-through

Only after a pass does ADR 0001's pipeline get built. On a fail, the finding is recorded
against the wedge in `CONTEXT.md`, not against the funnel.
