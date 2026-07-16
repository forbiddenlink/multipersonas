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
