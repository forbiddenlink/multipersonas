# Experiment: do personas beat a scripted crawler that also has a session?

**Status: PRE-REGISTERED 2026-07-16. No data collected yet. Written and committed before
the crawler exists, so the metric and the kill criterion cannot be chosen to fit a result.**

Written against: `e9f23b3` (main).

## Why this experiment decides the product

Run 3 established that authenticated scanning finds far more than a page scan: 78% of axe
defects on the Metabase fixture appear only in states unreachable from the entry page.
That is a real finding, and it is **not** a finding about personas. A hand-written
Playwright script with a session and axe would have found the same 66 elements.

So the honest question, the one the price tag rests on:

> Do LLM persona agents reach states — and therefore defects — that a competent scripted
> crawler with the same session does not?

If yes, this is a product no free tool replaces. If no, this is an authenticated axe runner
with a persona-authoring workflow: still useful, much cheaper, and it should be priced and
pitched as that instead.

## Arms

Both arms get **the same target, the same session, and the same axe configuration**. Only
the way they reach states differs.

- **Arm C (crawler):** breadth-first from the entry URL. Collects every same-origin `href`,
  visits each once, runs axe at each page. This is the thing a competent engineer builds in
  an afternoon, and it is the honest baseline.
- **Arm P (personas):** the product. Personas generated from the authenticated app, each
  driving the browser toward its goals, axe at every state reached.

### The crawler is deliberately steel-manned

A rigged baseline makes the experiment worthless, so the crawler is given the advantage
wherever there is a choice:

- **Larger budget.** 40 pages, versus roughly 3 personas x 30 steps. The crawler costs no
  model calls, so in real life you *would* let it run longer. Capping it at parity would be
  a thumb on the scale.
- Same session, so it is not stuck at the login wall.
- Same axe tags, same per-element granularity, same `(rule, element)` identity.
- It follows any same-origin link, including ones no persona would bother with.

What the crawler structurally cannot do: click a control that has no `href`, open a dialog,
apply a filter, submit a form, or reach a state whose URL nothing links to. **That gap is
the entire hypothesis.** If it turns out not to matter, the hypothesis is wrong.

## Unit of comparison

A **defect** is a `(ruleId, target)` pair — an axe rule violated by a specific element.
Not per-page: the same broken nav link on ten pages is one defect and one fix (this is
already how the product reports, see `groupAxeByRule`).

## Primary metric, declared now

```
personasOnly = P \ C          defects only the personas found
crawlerOnly  = C \ P          defects only the crawler found
shared       = P ∩ C
netNewPct    = |personasOnly| / |P ∪ C|
```

**`netNewPct` is the primary outcome.**

## Kill criterion, declared now

| netNewPct | verdict |
|---|---|
| **< 15%** | **KILL the differentiator.** Personas do not earn their cost over a script. Reposition as an authenticated axe runner; drop the "AI personas find what crawlers can't" claim entirely. |
| 15–40% | Weak support. Real but narrow; the pitch must be specific about which states, not a general claim. |
| > 40% | Strong support. The differentiator is real and priceable. |

`crawlerOnly` is reported too, and is not a footnote: if the crawler finds a lot the
personas miss, personas are not a *replacement* for crawling, and the honest product runs
both. A high `crawlerOnly` is evidence against the current design regardless of what
`netNewPct` says.

## Declared in advance, so they cannot become excuses

- **n=1 target.** One Metabase fixture. This can support a kill decision (if personas add
  nothing on a rich, interactive, real application, that is damning) but **cannot** support
  a general claim that personas win. A positive result means "run this on more targets",
  not "ship the pitch".
- **Non-determinism.** The persona arm is an LLM and will not repeat exactly. A single run
  is a point estimate. Rerunning the persona arm until the number improves and reporting
  the best is p-hacking; if it is rerun, every run gets reported.
- **This is the fourth metric in four runs.** The previous three were each flawed and were
  recorded as flawed rather than rescored. This one is committed before the code exists.
  If it turns out to be flawed too, it gets recorded as flawed and the fix is
  pre-registered for run 5 — it does not get quietly swapped.
- **The result may be that the product is smaller than hoped.** That is a legitimate
  outcome of this experiment and the reason it is worth running before pricing anything.

## Result

_To be filled in after the run. Nothing above may change once data exists._

---

## Result — 2026-07-16

**VERDICT: KILL_DIFFERENTIATOR. Pre-registered primary metric `netNewPct` = 13.7%, below
the 15% threshold declared before the crawler was written.**

| | personas (Arm P) | crawler (Arm C) |
|---|---|---|
| states reached | 9 | **40** |
| defects found | 92 | **264** |
| shared | 50 | 50 |
| **only this arm** | **42** | **214** |
| model calls | ~90 | **0** |

The crawler did not merely compete. It reached 4.4x more states, found 2.9x more defects,
missed 42 the personas found, and found **214 the personas missed** — for no model cost.
`crawlerOnly` was declared in advance as evidence in its own right, and it is the loudest
number here: personas are not a superset of crawling, they are a worse subset of it.

### The metric was flawed. Recorded, not rescored.

The `(ruleId, target)` key uses CSS selectors, and this target's UI library generates
random ids per render (`#mantine-u9fiwu7vi-target`, `.__m__-r6r > input`). The same element
in two runs therefore looks like two different defects. Proof it is an artifact: **0 of 50
shared defects contain a random selector**, because a regenerated id can never match across
arms. 30 of 42 `personasOnly` and 164 of 214 `crawlerOnly` are this churn.

This is the fourth metric in four runs and the fourth to be flawed. Per this file's own
pre-registration it is recorded as flawed rather than swapped, and the fix is
pre-registered below.

### Exploratory sensitivity check (NOT the pre-registered result)

Normalising framework-generated ids — deliberately run in the direction that would *rescue*
the personas — gives `netNewPct` = **11.0%** on a union of 109 defects. **The verdict does
not change; it gets worse.** The kill is robust to the flaw that most flatters the personas.

### What survives the flaw entirely

Two findings do not depend on the selector key at all, and they are the decisive ones:

1. **States: 9 versus 40.** Not a selector question. The crawler simply went further.
2. **Zero of the persona-only states were interaction-only states.** All three
   (`/dashboard/2-kpi-tracking-dashboard`, `/browse/databases/1-sample-database`,
   `/table/6-accounts`) are ordinary linked URLs that the crawler's breadth-first order had
   not dequeued yet. A bigger budget finds them. **The hypothesis was that personas reach
   states with no URL — dialogs, filters, form states. It produced zero such states.**

The filter-applied dashboard URL that motivated this experiment did not recur. One URL was
an anecdote, as run 3 said it was.

### The one thing personas did that a crawler cannot

Three of the twelve genuine persona-only defects are inside an opened dropdown, rendered in
a portal:

```
region|button[data-testid="dashboard-export-pdf-button"] > .mb-mantine-Menu-itemLabel
region|button[data-testid="embed-menu-public-link-item"] > .mb-mantine-Menu-itemLabel
region|div[data-portal="true"]:nth-child(10)
```

A link crawler structurally cannot open a menu, so these are real net-new and exactly the
kind of thing the pitch promised. They are also **3 defects out of a union of 109 — under
3%** — bought with ~90 model calls. The differentiator exists. It is not worth a product.

## What this means for the product

The evidence says the expensive half is the weak half:

- **An authenticated crawler plus axe at every page is the product.** It found 97 distinct
  defects across 40 states, deterministically, repeatably, for zero model cost. Nothing
  free does this well — `axe` CLI does not crawl, and it does not hold a session.
- **Personas are an add-on, not the pitch.** Their unique contribution is reaching states
  behind an interaction (open menus, dialogs, portals). That is a real feature worth
  offering and a rounding error in coverage.
- The claim "AI personas find what crawlers can't" is not supported and should not be made.

Task success — how many personas achieved their goal — remains a genuinely useful output
that a crawler cannot produce at all. It is a different product from accessibility
coverage, and it should be priced and pitched as one, on its own evidence.

## Pre-registered for run 5

Declared now, before any run 5 data:

1. **Fix the defect key.** Identify a defect by `(ruleId, normalised selector)` where
   framework-generated ids are collapsed, or better, by `(ruleId, DOM path of stable
   ancestors + role + accessible name)`. Validate the key on two crawls of the *same*
   target: a correct key yields `crawlerOnly ≈ 0` between two identical runs. **That
   self-check should have existed before run 4 and its absence is why run 4's number is
   unreliable.**
2. **Primary metric for run 5 is unchanged** (`netNewPct`, kill below 15%), so run 4 and
   run 5 stay comparable.
3. **Add the crawler as Arm C on every future run.** Any claim about personas is now
   measured against it by default.
4. **n is still 1.** Run 5 adds a second target with heavy interaction (a checkout or a
   multi-step form) — the case most favourable to the persona hypothesis. If personas lose
   there too, the interaction-state feature is dead, not just unpriceable.
