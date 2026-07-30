# Design: Honest Automated ACR / VPAT-lite (the "wanted" artifact)

Written against: main @ post-audit (2026-07-30). Snapshot as of 2026-07-30.

## Why (grounded in research)

The moat is **authenticated, deterministic, deep-state evidence + the agency workflow** —
NOT the AI personas (personas-vs-crawler experiment killed the "beats crawlers" claim at
13.7% net-new; the net-new experiment's own README says a Playwright+session+axe script
finds the same defects). Market research: the top-3 things agencies *want* are (1) CI-gate
deterministic violations at authenticated states [the wedge], (2) white-label multi-client
reports, (3) **VPAT/ACR generation** — a high-margin buying trigger ($350-25K) no cheap tool
offers. A funded competitor (TestParty) is entering the $50-300/mo lane on an *AI-detection*
framing — which is reputationally toxic post-accessiBe ($1M FTC fine; DOJ "overlays ≠
compliance"). Our wedge is **honest deterministic evidence**, and the ACR is where that
becomes a handable, resellable, legally-shaped artifact.

## The four users (the Report travels a chain)

1. **Developer** (runs CLI, wires CI): wants low-noise, exit codes, JSON output, exact
   selectors. Fear: a noisy tool they'll disable. (The defect-key false-positive fix is why
   they trust it.)
2. **Freelancer / agency owner** (buyer): wants per-client organization, a report they put
   *their* logo on and resell, SMB pricing. Fear: false confidence that gets torn apart by
   opposing counsel — wants to look credible, not "automated."
3. **Client** (non-technical, receives the Report): wants "am I OK / what's my risk / what
   do I fix first" in plain language + a format their lawyer recognizes. Fear: a wall of
   aria-* rule IDs.
4. **Client's lawyer / procurement**: wants a real ACR — WCAG SC × conformance level +
   remarks + methodology + date.

## The differentiator, made concrete

**An honest, partial, automated ACR is the anti-accessiBe.** axe-core can determine a
subset of WCAG 2.2 AA criteria; the rest need human judgment. Overlays/AI claim *full*
compliance — the accessiBe trap. We generate the ACR filling only what axe can prove
deterministically, and explicitly mark the rest "Needs Manual Review." "Real evidence for
what machines can test, honestly flagged for what they can't" is a sentence no overlay
vendor can say.

## Conformance logic (the honest 3-way mapping)

Inputs: the run's axe verdicts (each carries the WCAG SC codes it violates), the full
WCAG 2.2 A+AA catalog, and the set of SC codes axe can test (the codes in wcag.ts
TAG_TO_CRITERION).

For each catalog SC:
- has ≥1 violation in this scan  → **Does Not Support** (with violation count + locations)
- else, axe-testable, 0 violations → **Partially Supports** — "automated checks pass;
  portions of this criterion require manual verification." (Automated-clean is NOT full
  Supports — claiming it would overclaim. This conservatism is the credibility.)
- else (not axe-testable)          → **Needs Manual Review** — "automated tooling cannot
  evaluate this criterion."

We never emit a bare "Supports" from automation alone. 4.1.1 Parsing is excluded (removed
in WCAG 2.2). This is a pure function → unit-tested.

## Phases

- **P1 — Conformance engine.** `wcag-catalog.ts` (full 2.2 A+AA, sourced from W3C),
  `conformance.ts` (`buildConformance`, TDD), export axe-testable codes from `wcag.ts`,
  add `conformance` to `ReportData`.
- **P2 — ACR report UI.** Conformance table + plain-language exec summary + provenance/
  methodology line, in the report page. Print-to-PDF already works.
- **P3 — White-label depth.** logo (logo_url on profiles → render; upload deferred) +
  client name (already have).
- **P4 — Public sample ACR.** A static sample report, no auth — agencies want to see the
  artifact before signing up (a conversion lever the research flagged).
- **P5 — CLI JSON export.** `--json` on the CLI report generator (devs expect it for CI).

## Non-goals (do not cross)
- No fake full-conformance / "Supports everything" claim (the accessiBe failure mode).
- Personas never enter the ACR (compliance = axe only, per CONTEXT.md).
- Not building Stripe billing / multi-seat / scheduled scans here — gated on the demand
  signal per the founder's kill matrix.
