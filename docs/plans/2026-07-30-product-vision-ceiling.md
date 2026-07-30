# Personaudit: the ceiling (product vision)

Written 2026-07-30. Snapshot of the ambitious direction, grounded in market + capability
research. This is the destination, not the next sprint. No em dashes (house style).

## The core insight

The whole accessibility-tooling category is boring. Every competitor outputs the same
spreadsheet: severity, rule ID, selector, done. Nobody has made the artifact something you
want to open, watch, or share. That is the opening.

Personaudit's engine is what none of them have: an AI wears a human's mind and drives a
real browser toward a goal. axe gives the verdict. The persona gives the story of the
struggle. So Personaudit is the only tool that can show a real-shaped human trying to use a
site and getting stuck, as a narrative rather than a bug list. The moat is not "better a11y
coverage" (a plain crawler wins there, measured). The moat is FELT FRICTION. That is a
bigger product than accessibility: it is usability and task-success, of which a11y is one
lens. The personas are the engine of that bigger product, not a weakness to prop up.

Design north star: make the evidence feel like a Playwright trace and the finding feel like
a diff.

## Signature "wow": Persona Replay Theater

Every persona run becomes a scrubbable timeline (Playwright Trace Viewer, applied to "did a
real user succeed"): screenshot per action, the goal it was chasing, the axe evidence
captured at that exact state, and the persona's inner monologue captioned underneath. Deep
link to any moment. This is the demo that makes someone say "holy cow" and share it. We
already capture the states in the engine; this annotates and stitches them.

## Quick delight wins (high wow, low effort, reuse existing data)

- Stuck-moment clip: auto-cut a 6s loop of exactly where task-success stalled. Slack-able.
- Frustration ribbon: 0-100 per step, calm-blue to rage-red. One glance shows the break.
- Copy-paste fix snippets: each axe finding ships corrected markup/ARIA, one-click copy.
- Shareable scorecard + "Audited by Personaudit" badge: one hero number, embeddable,
  links to the live report. Compounding reach.
- Fix-diff previews, not violation lists: render the before/after code patch live.

## Signature features

- Vision layer (biggest capability unlock): the agent sees the screenshot, not just the
  a11y tree, so it catches low-contrast-in-context, invisible focus rings, tap targets too
  small, mid-click layout shift. Strictly usability opinion, never a compliance claim. The
  axe-verdict / persona-opinion wall stays intact.
- Before/after remediation preview: apply a proposed fix to a proxied copy, re-run the same
  persona, show side-by-side journeys. Proof, not promise.
- Interactive report microsite (not a PDF): filter by persona, replay any journey, toggle
  axe vs usability, expand a finding to code + video, export the ACR.

## Personas get richer (turns a tool into a platform)

- Custom personas per client: editable patience budget, tech literacy, device profile.
- Persona memory: "last week Grandma finished checkout; this deploy she gave up."
- Persona-vs-persona comparison: same goal, N shapes, side by side, task-success headline.
- Competitor teardown mode: point the impatient-exec persona at three rivals and you; drop
  the scorecard in a pitch deck. Auth-free, so it works on anyone.

## Moonshots that make it the noun

- Usability CI: gate deploys on task-success regression, not just new WCAG violations
  ("this PR drops mobile-3G checkout completion 92% to 61%"), failing journey clip posted
  to the PR. Usability becomes a tracked metric over time, like uptime.
- Site usability cartographer: turn the crawl into a graph, every state a node, every
  persona path an edge, dead ends and rage-quit cliffs as a navigable map. A new primitive.
- Public directory of provably-usable sites, ranked by real task-success. Network-effect
  moat: more sites audited, more authoritative, more everyone wants the badge.

## Sequencing

Floor (shipped): the honest ACR + the demand test. Proves it is wanted.
First from this vision: Persona Replay Theater (the journey filmstrip). Highest wow, reuses
the screenshots the engine already captures, makes the whole product feel alive in the demo
(which is what converts the outreach). Then the vision layer, then usability CI.

Sources: Playwright Trace Viewer, Sentry session replay, Warp, Raycast, Stripe dashboard,
Meticulous, Ranger, Deque axe + machine vision + MCP, TestParty continuous scanning. Full
citations in the research task logs of this session.
