# Experiment: do deep states hold violations a page scan misses?

**Status: two runs, 2026-07-15. Signal is real and strong on apps that resemble real
products. Both metrics so far have been flawed, which is itself the main methodological
finding — read "Metric iteration is a warning sign" before trusting any number here.**

## Result of run 2 (n=4)

Pre-registered primary metric (`primaryOutcome`, declared before the run):

| target | outcome | net-new blocking |
|---|---|---|
| saucedemo | **CRAWLER_WRONG** | 3 |
| the-internet | CRAWLER_RIGHT_BUT_SHALLOW | 5 |
| orangehrm | CRAWLER_RIGHT_BUT_SHALLOW | **35** |
| applitools-demo | NOTHING_HIDDEN | 0 |

**Pre-registered headline: crawler verdict wrong on 1/4.** That is weak support, and it
is the number of record.

### But look at what it classified as "shallow"

**OrangeHRM** is a real open-source HR product, not a fixture. A crawler scanning it
sees **1** blocking violation. There are **36**. The crawler sees **2.8% of the
product** and reports one issue on the login page while 35 sit behind it — including
14 on the admin user grid and 5 on a form's validation-error state.

My pre-registered metric called that "the monitor's verdict stands; only its detail is
thin." That is not a defensible description of missing 97% of a product's violations.
**The binary clean/not-clean test is too coarse**: one cosmetic finding on a login page
is enough to make the monitor "right", regardless of what it never saw.

### The pattern the data actually shows (POST-HOC — see warning below)

| target | shape | crawler coverage of blocking violations |
|---|---|---|
| saucedemo | store behind login | **0.0%** |
| orangehrm | real app behind login | **2.8%** |
| the-internet | public link index | 89.8% |
| applitools-demo | toy dashboard behind login | 100.0% |

It is not "login-gated vs not" — applitools is login-gated and scores 100%, because
there is no real application behind its door, just a table. The split is **is there a
real application behind the door**. On the two targets that resemble real products,
crawler coverage is **0% and 2.8%**.

That is the pitch, with numbers: *a monitoring platform scanning OrangeHRM reports one
issue; the product has thirty-six.*

## ⚠️ Metric iteration is a warning sign

**Two runs, two metrics, both flawed, and each replacement looked better only after
seeing the data.** That is the shape of p-hacking even when every individual step feels
honest:

1. Run 1 metric (`netNewBlockingPct`) — dominated by how broken the entry page is.
2. Run 2 metric (`crawlerVerdictWrong`) — binary, so one cosmetic login-page finding
   masks a 97% blind spot.
3. Now "coverage ratio" looks right… **and I am looking at it after seeing the data.**

**Coverage ratio is therefore a HYPOTHESIS, not a result.** It does not get to be the
headline for run 2. The rule for run 3, declared now, before any run-3 target is
chosen or scanned:

> **Primary metric, run 3: crawler coverage ratio** = `baselineBlocking / (baselineBlocking + netNewBlocking)`.
> **Kill: if median coverage across real login-gated applications is >25%, the thesis is dead.**
> Targets must be applications with real functionality behind auth, chosen and written
> down before scanning. Fixtures with toy interiors (applitools-demo) do not count as
> evidence either way and are excluded from the median.

If run 3 on independent targets reproduces 0-3% coverage, the claim is real. If it
lands near 25%+, the pattern here was two lucky targets.

## Honest limits, still

- **n = 2** for targets resembling real apps. Two is not a finding, it is a lead.
- All targets are vendor-published demos. Real production apps may differ.
- Demo instances may be *worse* than production (less design polish) — which would
  inflate the deep-state counts. Untested assumption.
- This measures **reach, not coverage of WCAG**. axe finds ~15/50 success criteria at
  *any* state. "The crawler misses 97% of what axe can find" is not "we find
  everything" — we also miss ~70% of criteria, everywhere.

## Result of run 1

| target | baseline blocking | net-new blocking | net-new % | pre-registered verdict |
|---|---|---|---|---|
| saucedemo | **0** | 3 (all critical) | 100.0% | PASS |
| the-internet | 44 | 5 | 10.2% | KILL |

Split. And the split is the finding.

**Sauce Demo is the interesting one.** Its baseline is *zero* — a crawler scans the
login page, finds nothing, and reports the site clean. Behind the login sit three
critical violations: `select-name` (a dropdown with no accessible name),
`button-name` twice, one on the checkout error state. **The crawler's verdict was not
incomplete, it was wrong.** That is the shape of every login-gated SaaS and store:
public surface is a marketing page or a login form, and everything real is behind
auth.

**the-internet "failed" for an uninteresting reason.** Its landing page is a link
index carrying 44 pre-existing violations. Deep states did add 5 genuine net-new
findings; they were simply swamped by the denominator.

## What the first run taught us (the metric is wrong)

`netNewBlockingPct = netNewBlocking / allBlocking` is **dominated by how broken the
entry page already is**, not by whether deep states hide anything:

- Clean entry page → ~100% trivially (100% *of 3*).
- Broken entry page → low %, no matter what is hidden behind auth.

It answers "what share of this site's violations are deep?" The question that matters
is **"would a crawler-based monitor's verdict be wrong?"** Sauce Demo: catastrophically
yes. the-internet: no — it already says "broken".

The goalposts are deliberately **not** being moved for run 1; the pre-registered
threshold stands and is reported as measured. Run 2 should pre-register a better
primary metric *before* running:

> **Verdict-accuracy**: does the baseline scan's blocking-violation verdict (clean /
> not clean) match the deep scan's? Count sites where a crawler would report clean
> and deep scanning finds ≥1 blocking violation. That is the false-negative rate of
> crawler-based monitoring, and it is the number the pitch actually rests on.

Secondary, and honest about scale: **absolute** net-new blocking count. Three
violations is a real miss but a thin product. If real login-gated apps also yield
single digits, the pitch is true and still not a business.

## Why this is not yet evidence

- **n = 2**, both synthetic test sites. Sauce Demo's cleanliness is itself artificial.
- Absolute numbers are tiny (3).
- Needs **real login-gated apps** — the five Liz owns — before it means anything.

---

## Original design (unchanged, still how the harness works)

## The question

The pitch for this product is: *monitoring platforms crawl pages; they don't complete
transactions, so the flows behind ~70% of ADA lawsuits are the ones your monitor never
scans.* That's only worth selling if deep states actually contain violations a
page-level scan doesn't already report.

**Nobody has published this number.** Rule coverage is well studied (~15/50 WCAG
success criteria are automatable; WebAIM Million says 96% of errors are six failure
types). *State* coverage is not studied at all. That's why this measurement is
currently worth more than the product: if the number is high it's a publishable
marketing asset; if it's low we saved a quarter.

## Kill criterion — set in advance, on purpose

> **If net-new critical/serious violations are <30% of all critical/serious
> violations found, the thesis is dead. Stop and reconsider.**

Written down before the first run so the result cannot be rationalised afterwards. A
number chosen after seeing the data is not evidence.

## Method

Zero LLM. Plain Playwright + axe-core, fully deterministic and re-runnable.

1. **Baseline** — load the entry URL, run axe. This is what a crawler sees.
2. **Deep states** — script the browser into each named state (open the cart, submit
   an invalid form, open the dialog, reach checkout step 2), run axe at each.
3. **Diff** — a violation is *net-new* if its identity does not appear in the
   baseline.

### Violation identity

`ruleId | impact | target-selector`. Reported two ways, because they answer different
questions:

- **net-new instances** — a distinct element failing a rule. The headline number.
- **net-new rule types** — a rule that never fires on the entry page at all. Stronger
  evidence: it means a whole category of failure is invisible to a crawler.

### The honesty controls

These exist to stop the experiment from flattering itself:

- **Global chrome is excluded from "net-new".** A header contrast failure repeating on
  every state is not a discovery; the baseline already caught it. Violations whose
  identity appears in the baseline are excluded even when they recur.
- **A state that fails to load is recorded as an error, not silently dropped.** A
  harness that quietly skips hard states would inflate the result.
- **Every state is scanned with the identical axe config as the baseline.** Different
  rule tags between baseline and deep would manufacture net-new findings.
- **Targets are declared up front** (`targets.ts`), not chosen after seeing results.

## Caveats to state when reporting the number

- Demo/test e-commerce sites are not production sites; their a11y may not be
  representative. Where possible, prefer real sites, and reach only states that do
  not require completing a transaction.
- axe finds ~30% of WCAG criteria at *any* state. This experiment measures reach, not
  coverage. A high net-new number means "crawlers miss a lot of what axe *can* find" —
  not "we find everything".
- Small n. This is a directional signal, not a paper.

## Run

```bash
pnpm exec tsx experiments/net-new-violations/run.ts            # all targets
pnpm exec tsx experiments/net-new-violations/run.ts saucedemo  # one target
```

Writes `experiments/net-new-violations/results/<target>.json` and prints a verdict
against the kill criterion.
