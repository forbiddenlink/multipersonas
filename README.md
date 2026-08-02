# multipersonas

Point it at a URL — including one behind a login. It crawls the site and checks
every state it reaches for accessibility defects.

Two commands, and the split reflects what the evidence actually supports:

- **`scan`** is the core. It crawls the site (with a saved session, behind the login
  wall) and runs **axe-core** at every state, reporting deterministic, citable rule
  violations. This is the part nothing free replaces: the `axe` CLI does not crawl and
  does not hold a session.
- **`run`** adds LLM **UX personas** (a first-time visitor, a mobile user on slow 3G)
  that browse toward a goal. Its unique output is **task success** — did a real-shaped
  user actually complete the flow? — which a crawler cannot produce at all. Its finding
  output is *opinion*: jargon, buried pricing, tap targets. Useful, never compliance.

**Honest status of the persona layer:** we tested whether personas find accessibility
defects a scripted crawler misses. They do not — a head-to-head on a real app
(`experiments/personas-vs-crawler/`) found the crawler reached 4x more states for zero
model cost. So personas are **not** pitched as an accessibility tool. Their surviving,
distinct value is task-success — a crawler cannot tell you whether a real-shaped user
completed a flow — and it is **validated**: on a labelled probe set
(`experiments/task-success-validity/`) the verdict never once claimed success on a
genuinely impossible task (0% false-success, 90% agreement, holding across both runs).
n=2 targets so far (Metabase, then SauceDemo — an interaction-heavy checkout), each goal
run once, so the next step is more targets and repeated runs per goal, not a launch.

- **Accessibility violations** come from **axe-core** — deterministic, citable, and
  the only thing here that touches compliance.
- **Usability friction and task success** come from **UX personas**. Opinion and
  outcome, never compliance.

**We do not simulate disabled users.** There is no "blind user" persona and there
will not be one. An LLM roleplaying a disability is inaccurate (LLM accessibility
judgments measure ~71% precision) and it is harmful — see
[Ashlee Boyer](https://ashleemboyer.com/blog/how-to-dehumanize-accessibility-with-ai/)
on why synthetic disabled characters don't represent anyone. What we keep is the
*procedure*: the `keyboard-traversal` profile drives the site keyboard-only to reach
states a page-level scan never sees, and axe renders the verdict there. A mechanical
input constraint is a WCAG 2.1.1 test. A costume is not.

**This does not replace testing with disabled people.** Nothing automated does. If
you need that, use [Fable](https://makeitfable.com/), who pay disabled testers.

**Status: prototype. The core bet is measured; the product shape changed because of
it.** Deep states behind auth *do* hold violations a front-page scan misses (78% of
them on the test app — `experiments/net-new-violations/`), and `scan` is built around
that. Personas do *not* beat a crawler at finding them
(`experiments/personas-vs-crawler/`), so the pitch shifted from "AI personas find what
crawlers can't" to "authenticated accessibility scanning, plus a persona task-success
layer." The web app is not deployed and cannot be as written — see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Install

```bash
pnpm install
cp .env.example .env                    # ANTHROPIC_API_KEY only for `run`/`generate`; `scan` needs no key
pnpm exec playwright install chromium
```

## Use

### Scan (the core — deterministic, free, no AI)

```bash
# Crawl a public site and check every page for accessibility defects
pnpm dev -- scan https://example.com

# Scan behind a login: authenticate once, then scan with the saved session
pnpm dev -- auth https://app.example.com --save ./session.json
pnpm dev -- scan https://app.example.com --session ./session.json --max-pages 60
```

`scan` writes a Markdown report of axe-core rule violations, grouped by rule, each
listing its elements and every state it appeared in. No model calls.

**Gate a build on it.** `scan` is deterministic and needs no `ANTHROPIC_API_KEY`, so it
drops into CI. Baseline your current defects once, then fail only on new regressions:

```bash
# One time: snapshot today's defects as the accepted baseline, and commit it
mpersonas scan https://app.example.com --session ./session.json \
  --baseline mpersonas-baseline.json --update-baseline

# In CI: exit non-zero only on NEW defects at/above a severity (existing backlog ignored)
mpersonas scan https://app.example.com --session ./session.json \
  --baseline mpersonas-baseline.json --fail-on serious
```

The baseline keys defects by a render-stable id, so framework-generated element ids
(`#mantine-…`) don't read as regressions. A ready-to-use GitHub Action is in
[`examples/github-actions/`](examples/github-actions/accessibility-gate.yml). Exit codes:
`0` pass, `2` gate failed, `1` usage/runtime error.

### Run (personas — task success + usability opinion)

```bash
# Personas tailored to the site browse toward a goal
pnpm dev -- run https://app.example.com --session ./session.json --count 4

# Author personas your team owns: generate a draft, edit it, commit it
pnpm dev -- generate https://app.example.com --session ./session.json --count 4 --save
$EDITOR mpersonas/*.json        # edit goals to match users you care about
pnpm dev -- run https://app.example.com --session ./session.json   # picks up ./mpersonas/

# Manage personas
pnpm dev -- list
pnpm dev -- create --from-json ./persona.json
pnpm dev -- delete <id>
```

`run` reports task success (how many personas achieved their goal), usability
observations, and the same axe defects `scan` produces. Personas live in `./mpersonas/`
in your repo, so they are diffable, reviewable, and picked up automatically.

The npm package is **`multipersonas`**; the command it installs is **`mpersonas`**.
After `npm install -g multipersonas` (or `pnpm build` locally) the same commands work as
`mpersonas scan <url>`.

## How it works

```
scan:  URL ──> url-guard ──> Chromium (+session) ──> BFS crawl same-origin
                                                        └─> axe-core at each state ──> merged report

run:   URL ──> url-guard ──> Chromium (+session) ──> persona agent (LLM) x N ──> report
                                                        loop: snapshot -> choose tool ->
                                                        act -> axe-core at each state
```

Both merge axe findings by a stable defect key (`src/agent/defect-key.ts`) that
collapses framework-generated element ids, so one broken component is one defect across
every state it appears in — not one per page.

Each profile gets a system prompt built from its `kind`, goals, viewport, and input
modality (`src/personas/types.ts`). `kind: "ux"` produces a person with goals whose
output is opinion; `kind: "traversal"` produces a harness that is explicitly told it
is not a person and must not judge accessibility. The agent loop
(`src/agent/engine.ts`) hands the model an accessibility-tree snapshot each step and
lets it call `click`, `type`, `scroll`, `navigate`, `report_finding`, or `finish`
(with an explicit `achieved`/`blocked` outcome — the report never infers success from the
fact that the agent stopped).

`src/personas/framing.test.ts` enforces the above: no profile may claim a disability,
and none may be asked for a WCAG verdict. Those tests are a product constraint.

## Security

This product's core action is hostile by construction: it points a browser at a URL a
stranger supplied, and lets an LLM that has read that stranger's page decide where to
navigate next. Both inputs are attacker-influenced.

`src/security/url-guard.ts` is the chokepoint. Every navigation — the initial URL, the
agent's `navigate` tool, the axe scan, and persona generation — resolves the hostname
and validates the **resolved addresses**, rejecting loopback, RFC1918, link-local
(including cloud metadata at `169.254.169.254`), CGNAT, and the IPv6 equivalents plus
IPv4-mapped/NAT64/6to4 wrappers. The engine additionally vets every document request,
so a 3xx redirect can't bounce a clean host to a private one.

Known limit: DNS rebinding is not fully closed in-process — we resolve, then Chromium
resolves again on connect. Closing it needs an egress firewall on the browser host.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Do not deploy the web app publicly** until the blockers in that doc are done —
durable rate limiting, a spend cap, and network isolation.

## Cost

`scan` costs zero model calls. A `run` with three personas is on the order of 65 model
calls (per-persona step budgets). The agent sends a bounded window of recent history rather than the full
transcript (`HISTORY_WINDOW` in `src/agent/engine.ts`), which keeps input tokens flat
across a run instead of growing with every step. There is no global spend cap yet.

## Development

```bash
pnpm test          # CLI/engine tests (vitest)
pnpm exec tsc --noEmit
cd web && pnpm test && pnpm lint
```

## License

MIT
