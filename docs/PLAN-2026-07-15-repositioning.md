# Plan: reposition multipersonas around reachability

**Written against:** `1ec6483` (main, 2026-07-15)
**Status:** destination doc. Frozen once work starts — reality lives in the code and
the issue tracker, not here. See `~/.claude/rules/docs-rot.md`.

## The problem this solves

The product currently claims, implicitly, that an LLM can stand in for a disabled
user. Two things are wrong with that, and they compound:

1. **It doesn't work.** LLM accessibility judgments measure ~71% precision
   ([ScreenAudit, CHI 2025](https://arxiv.org/abs/2504.02110)). We ship those
   judgments as findings with severities, unvalidated.
2. **It forfeits the audience.** `src/personas/prebuilt.ts:37` ships "James, a
   42-year-old software engineer who is blind", prompted with "You are James… you
   CANNOT see the screen." The category takedown is already written by name
   ([Ashlee Boyer, *How to Dehumanize Accessibility with AI*](https://ashleemboyer.com/blog/how-to-dehumanize-accessibility-with-ai/)):
   *"The 'synthetic characters' do not represent us."* Peer-reviewed work finds
   disability simulation makes people rate disabled people as **less capable**
   ([Silverman et al.](https://www.apa.org/education-career/k12/infusing-diversity/social-personality/research-summary-blindness-simulation-empathy)).
   The FTC fined accessiBe $1M over AI accessibility claims.

The accessibility community's endorsement is the thing that sells this product. The
current design trades it for a feature that doesn't work.

## ⚠️ Correction — 2026-07-15, same day, after wedge research

**The "What we sell" section below is wrong as written. Do not act on it.** Kept
here rather than deleted so the mistake is legible.

- **"axe-core never sees deep states" is FALSE.** `@axe-core/playwright` does
  ~4.5M downloads/week doing exactly drive-then-scan. Lighthouse's own docs say it
  can "evaluate best practices of menus and UI elements hidden behind
  interaction". pa11y has `actions`. In **dev/CI tooling, reach is solved and
  free.** There is no wedge there.
- **The reach gap is real in *crawler-based monitoring*** — Siteimprove, axe
  Monitor, Level Access. Deque sells against its own crawler in print: "The
  inability to scan dynamic site content is another limitation of automated
  crawlers... Manual testing covers dynamic content because someone is actually
  sitting and driving the page". Karl Groves: automated tools "do not interact with
  the forms" and are "never able to assess errors... after submitting the form".
  That is a different, narrower product than the one described below, aimed at
  where recurring budget actually sits.
- **The binding constraint is rule coverage, not reach.** Only ~15/50 WCAG success
  criteria are automatable at all. Driving axe to more states multiplies a tool
  that misses ~70% of criteria at *every* state. Reach is the lever we can pull;
  it is not the lever that matters most.
- **TAM is small.** Whole digital-accessibility software market ~$0.80B (2025) →
  ~$1.08B (2030). And the volume buyer demonstrably wants a defensible-looking
  artifact, not deeper truth: overlay vendors still fund fine *after* the FTC's $1M
  accessiBe order and 600+ Overlay Fact Sheet signatories. This product sells more
  truth to a market paying for less.
- **Verdict on the thesis: THIN**, not solid.

**What this changes:** Phase A (the reframe) proceeds unchanged — it is correct
whether or not we ever sell this, because we should not ship a fake blind man
regardless. Phase C (axe at every state) is **on hold** pending Phase B.

**Phase B is now the whole decision**, and it got cheaper: run the net-new-violations
experiment with **no LLM at all** — plain Playwright scripts driving five apps Liz
already owns into deep states, axe at each, count violations that a single-URL scan
did not already report. **Kill criterion, set in advance: if net-new critical
violations are <30%, stop.** Nobody has published this number, which currently makes
the datapoint worth more than the product: if it's high, it's the marketing asset
that sells the narrow version; if it's low, it saved a quarter.

**The narrow claim that survives**, if Phase B passes — defensible because Deque and
Groves already said the first half and UsableNet supplies the second:

> Accessibility monitoring platforms crawl pages; they don't complete transactions —
> so the checkout and account flows that drive ~70% of ADA lawsuits are the ones your
> monitor never scans.

**Auth (open question below) is partly answered:** vaulted-credential scanning is
commercially proven by the DAST category, so it doesn't kill a SaaS; MFA is the real
blocker. A CLI where credentials never leave the user's machine is both the honest
security answer and *what this repo already is* — which argues CLI-first.

Unverified and flagged: the $50k-250k enterprise-audit figure has no named primary
source. Don't quote it.

## The reframe

**The LLM navigates. Deterministic axe judges.**

This is the whole idea. It is not a compromise — it is the only framing where the
LLM's unreliability never touches the claim we sell, because the LLM never renders
a verdict. It drives the browser into states a stateless scanner cannot reach, and
axe-core renders the verdict at each one.

### What we sell

axe-core scans *a URL*. It cannot add to cart, reach checkout step 3, open the
authenticated dashboard, or trigger the error state — so those states are never
scanned. That is where litigation lands: ~70% of web accessibility suits target
e-commerce; federal filings went 2,452 (2024) → 3,117 (2025) → 6,000+ pace 2026
([UsableNet](https://blog.usablenet.com/ada-web-lawsuit-trends-2026)).

**The scan is commodity. Reachability is not.** WebAIM Million finds 96% of all
errors come from six failure types axe already catches for free — so we never
compete with free scanners on *scanning*. We compete on *where the scan runs*.

### Identity simulation → mechanical constraint

The distinction that makes this defensible:

| Forbidden (simulation) | Allowed (mechanical constraint) |
|---|---|
| "You are James, who is blind" | "Navigate using only the keyboard" |
| "You cannot see the screen" | "Viewport is 375x812" |
| "Evaluate for WCAG compliance" | "Reach the checkout confirmation state" |
| Reports *experiences had* | Reports *conditions found in the accessibility tree* |

Keyboard-only operation is not a simulated disability — it is a WCAG 2.1.1
requirement and standard test practice. A 375px viewport is a fact. Neither
pretends to be a person. Both change which states are reachable, which is exactly
what we need.

## Scope

### Keep
- The persona library (`src/personas/library.ts`, `generator.ts`, `custom.ts`).
  This is the asset. The *goals* and *frustrations* are good product; only the
  identity framing and the a11y-judgment prompt go.
- Non-disability UX personas (first-time visitor, impatient executive). These are
  opinion, they're useful, and they carry no ethics exposure — but they must be
  labeled as UX opinion, never compliance.
- `src/security/url-guard.ts` and the whole engine loop. Unchanged.

### Change
1. **`src/personas/types.ts`** — the harm is generated here.
   - Drop `accessibilityNeeds` as a *simulation* driver. Replace with
     `constraints: { inputModality: "keyboard" | "pointer"; ... }` that produce
     mechanical instructions.
   - Remove "Evaluate every element you encounter for accessibility compliance"
     from the generated prompt. The LLM stops judging a11y entirely.
   - Remove "You are {name}, {description}" for any profile carrying a disability
     framing.
2. **`src/personas/prebuilt.ts`** — `screen-reader-user` ("James") becomes a
   keyboard-traversal profile. Keep the *procedure* (landmark → heading → tab →
   forms → live-region); drop the person.
3. **`src/personas/library.ts`** — `color-blind-user` ("David") is deleted, not
   reframed. Colour contrast is a deterministic axe rule; an LLM pretending to have
   deuteranopia adds nothing but liability.
4. **`src/agent/orchestrator.ts`** — run axe at *every visited state*, not once at
   the entry URL. This is the actual product. Today axe runs once
   (`orchestrator.ts`, step 1) and personas run separately.
5. **Report** (`src/report/generator.ts`) — separate the two classes of output
   hard: **Violations** (axe, deterministic, per state, citable) vs **UX notes**
   (LLM opinion, clearly labeled, no severity that implies compliance).

### Do not build yet
- Pricing/Stripe. No demand evidence.
- Web deploy. Blocked on the worker split — see `docs/DEPLOYMENT.md`.
- Authenticated flows. Depends on the credential-trust question (open, below).

## Honesty constraints (non-negotiable)

These are product requirements, not tone:

- Never claim WCAG *compliance*. The FTC order against accessiBe bars "can make any
  website WCAG-compliant" phrasing. We report violations found; we never certify.
- State the false-positive rate publicly. We do not currently know it — measuring it
  is a prerequisite to selling, not a nice-to-have.
- Say plainly, in the README and the product: **this does not replace testing with
  disabled people**, and link [Fable](https://makeitfable.com/).
- Report conditions found in the accessibility tree, never experiences had.

## Open questions

- **UNCONFIRMED: does the thesis hold?** "Deep states contain violations that a
  URL-level scan misses" is the entire wedge and is currently unmeasured. Test
  before building on it: pick a real multi-step flow, run axe at the entry URL,
  then run axe at each state, and count the delta. If the delta is ~0, this plan is
  void.
- **UNCONFIRMED: can free tools already do this?** Pa11y has `actions`, Lighthouse
  has Puppeteer scripting, axe-core/playwright exists. If teams can already script
  deep-state scanning for free, the wedge is thinner than claimed and the product
  is "you don't have to write the script" — a much weaker sell.
- **UNCONFIRMED: the auth problem.** Reaching an authenticated dashboard needs
  credentials. A SaaS asking for prod/staging logins is a hard trust barrier, and
  may be why nobody does this. A CLI where creds never leave the user's machine
  sidesteps it entirely — which would argue for CLI-first, not SaaS-first.
- **UNCONFIRMED: LLM navigation reliability.** If the agent reaches checkout step 3
  only ~50% of the time, "we scan states you can't reach" is not a promise we can
  keep. Needs real benchmark numbers.

## Sequence

- **Phase 0 — done (this session).** SSRF chokepoint + tests; ~10x token cost cut;
  CI gate restored; README/`.env.example`/`docs/DEPLOYMENT.md`.
- **Phase A — the reframe.** Scope above. Cheap now, expensive after anyone
  external sees `James`.
- **Phase B — prove the thesis. RUN 1 DONE 2026-07-15: DIRECTIONAL, not proven.**
  Harness in `experiments/net-new-violations/` (zero LLM, deterministic, 14 unit
  tests on the diff logic). Result: saucedemo PASS (100% — but its baseline is 0, so
  that is 100% *of 3*), the-internet KILL (10.2% — but its landing page already
  carries 44 violations). Split, n=2, both synthetic.
  - **The real finding:** a crawler scans Sauce Demo's login page, finds nothing, and
    reports the site **clean** — while 3 critical violations sit behind the login,
    one on the checkout error state. The crawler's verdict was *wrong*, not merely
    incomplete. That is the shape of every login-gated SaaS and store.
  - **The pre-registered metric is flawed** and running it is how we found out: the
    net-new *percentage* is dominated by how broken the entry page already is. Not
    retrofitted — recorded in the experiment README, threshold left as declared.
- **Phase B run 2 DONE 2026-07-15 (n=4).** Pre-registered primary (verdict-accuracy)
  headline: **crawler verdict wrong on 1/4** — weak, and it is the number of record.
  - **OrangeHRM is the finding.** A real open-source HR product: a crawler sees **1**
    blocking violation; there are **36**. It sees 2.8% of the product. The
    pre-registered metric called that "right but shallow" — which is not a defensible
    description of missing 97%. The binary clean/not-clean test is too coarse.
  - **Post-hoc pattern (a lead, NOT a result):** crawler coverage of blocking
    violations — saucedemo 0%, orangehrm 2.8%, the-internet 89.8%, applitools 100%.
    The split is *is there a real application behind the door*, not *is there a login*.
  - **⚠️ Two runs, two metrics, both flawed, each replacement chosen after seeing
    data.** That is p-hacking's shape even when each step feels honest. Coverage ratio
    is therefore pre-registered for **run 3 on independent targets** — kill if median
    coverage on real login-gated apps is >25%. See the experiment README.
  - **Targets are the blocker.** Liz's personal Vercel team is empty; the only real
    login-gated apps visible are under `cyber-ready-clinic` — client property, a
    validation zone, not scannable without her explicit sign-off. Run 3 needs either
    her own apps' URLs + test credentials, or independent third-party targets with
    real functionality behind auth.
- **Phase C — axe at every state.** Still on hold. Gate is Phase B run 2.
- **Phase D — worker split** (Railway Docker per
  `thoughts/shared/plans/2026-04-19-multipersonas-plan.md:934`), durable rate
  limiting, spend cap. Prerequisite for any public deploy.

Price anchor if this ships: one manual audit is $2K-7K; a11y freelance median
~$48/hr. $79-149/mo solo, $299-499/mo agency. Justify against one audit or one
consultant day — never against free scanners.
