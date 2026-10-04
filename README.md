# Personaudit

[![npm version](https://img.shields.io/npm/v/personaudit)](https://www.npmjs.com/package/personaudit)
[![CI](https://github.com/forbiddenlink/multipersonas/actions/workflows/ci.yml/badge.svg)](https://github.com/forbiddenlink/multipersonas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Accessibility scanner that crawls every reachable state of your site, behind the login too, and runs axe-core at each one.

```bash
npx personaudit scan https://your-site.com
```

![Terminal recording: personaudit grade and scan against a public page](docs/demo/scan.gif)

- **Crawls every state, including behind a login.** You sign in once in a local browser; the saved session stays on your machine.
- **Gates CI on new defects only.** Commit a baseline, then fail a build only when a change adds a defect at or above the severity you choose.
- **Keyless, nothing uploaded.** `scan` is deterministic axe-core: no API key, no model calls, no data leaves your machine.
- **Free hosted grade for public pages.** [personaudit.com/grade](https://personaudit.com/grade) gives a letter grade for any public URL. Hosted behind-login scanning does not exist; behind-login scanning is the local CLI.

`mpersonas` still works as an alias for `personaudit`.

## Usage

### Scan a site

```bash
npx personaudit scan https://your-site.com
```

`scan` writes a Markdown report of axe-core violations, grouped by rule, each listing its elements and every state it appeared in. Use `--max-pages <n>` to widen the crawl and `-o <dir>` to choose the report directory (default `./personaudit-report`). Scanning `localhost` or a private network needs `--allow-private`.

### Scan behind a login

```bash
# Sign in yourself (password, SSO, 2FA, magic link). Only the session is saved.
npx personaudit auth https://app.example.com/login --save session.json
npx personaudit scan https://app.example.com --session session.json --max-pages 60
```

The session file holds live cookies. Treat it like a password and keep it out of git (`.personaudit-session.json` is in this repo's `.gitignore`).

### Baseline and CI gate

```bash
# One time: snapshot today's defects as the accepted baseline, and commit it
npx personaudit scan https://app.example.com --session session.json \
  --baseline personaudit-baseline.json --update-baseline

# In CI: exit 2 only on NEW defects at or above a severity (existing backlog ignored)
npx personaudit scan https://app.example.com --session session.json \
  --baseline personaudit-baseline.json --fail-on serious
```

The baseline keys defects by a render-stable id, so framework-generated element ids (`#mantine-...`) do not read as regressions.

Exit codes: `0` clean, `1` error (bad input, blocked URL, missing browser), `2` gate failed.

### Grade a public page

```bash
npx personaudit grade https://example.com
```

`grade` crawls a public site and returns a letter grade from WCAG A/AA axe-core findings only. Add `--json` for the raw report.

### Run UX personas (optional, needs `ANTHROPIC_API_KEY`)

```bash
npx personaudit run https://app.example.com --session session.json --count 4

# Author personas your team owns: generate a draft, edit it, commit it
npx personaudit generate https://app.example.com --session session.json --count 4 --save
npx personaudit list
```

`run` reports task success (how many personas achieved their goal), usability observations, and the same axe defects `scan` produces. Personas live in `./mpersonas/` in your repo (the directory name predates the rename), so they are diffable and reviewable. Set the model with `PERSONAUDIT_MODEL` (`MULTIPERSONAS_MODEL` still works as a fallback).

If Chromium is missing, run `npx playwright install chromium`.

## GitHub Action

```yaml
- uses: forbiddenlink/multipersonas@v1
  with:
    url: https://staging.your-site.com
    fail-on: serious
    baseline: personaudit-baseline.json
```

Inputs, outputs (`new-defects`, `report-path`), and the behind-login setup are in [docs/github-action.md](docs/github-action.md). A copy-paste workflow is in [`examples/github-actions/`](examples/github-actions/accessibility-gate.yml).

## What this is and is not

- **Accessibility violations** come from axe-core: deterministic and citable. Automated checks find a subset of WCAG failures. Passing `scan` does not mean a site is accessible or compliant.
- **Personas are not an accessibility tool.** A head-to-head on a real app (`experiments/personas-vs-crawler/`) found the crawler reached 4x more states for zero model cost. The persona layer's distinct value is task success. On a labelled probe set (`experiments/task-success-validity/`) the verdict never claimed success on a genuinely impossible task (0% false-success, 90% agreement; n=2 targets, so more targets and repeated runs come next).
- **Deep states behind auth hold violations a front-page scan misses**: 78% of them on the test app (`experiments/net-new-violations/`). `scan` is built around that.
- **We do not simulate disabled users.** There is no "blind user" persona and there will not be one. LLM accessibility judgments measure about 71% precision, and synthetic disabled characters do not represent anyone ([Ashlee Boyer](https://ashleemboyer.com/blog/how-to-dehumanize-accessibility-with-ai/)). The `keyboard-traversal` profile drives the site keyboard-only to reach states a page-level scan never sees, and axe renders the verdict there.
- **This does not replace testing with disabled people.** If you need that, use [Fable](https://makeitfable.com/), who pay disabled testers.

Status: prototype. The web app uses a queue and persistent worker; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the public-launch checklist.

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
every state it appears in, not one per page.

Each profile gets a system prompt built from its `kind`, goals, viewport, and input
modality (`src/personas/types.ts`). `kind: "ux"` produces a person with goals whose
output is opinion; `kind: "traversal"` produces a harness that is explicitly told it
is not a person and must not judge accessibility. The agent loop
(`src/agent/engine.ts`) hands the model an accessibility-tree snapshot each step and
lets it call `click`, `type`, `scroll`, `navigate`, `report_finding`, or `finish`
(with an explicit `achieved`/`blocked` outcome; the report never infers success from the
fact that the agent stopped).

`src/personas/framing.test.ts` enforces the above: no profile may claim a disability,
and none may be asked for a WCAG verdict. Those tests are a product constraint.

## Security

This product's core action is hostile by construction: it points a browser at a URL a
stranger supplied, and lets an LLM that has read that stranger's page decide where to
navigate next. Both inputs are attacker-influenced.

`src/security/url-guard.ts` is the chokepoint. Every navigation (the initial URL, the
agent's `navigate` tool, the axe scan, and persona generation) resolves the hostname
and validates the **resolved addresses**, rejecting loopback, RFC1918, link-local
(including cloud metadata at `169.254.169.254`), CGNAT, and the IPv6 equivalents plus
IPv4-mapped/NAT64/6to4 wrappers. The engine additionally vets every document request,
so a 3xx redirect can't bounce a clean host to a private one.

Known limit: DNS rebinding is not fully closed in-process: we resolve, then Chromium
resolves again on connect. Closing it needs an egress firewall on the browser host; the
hosted worker ships one (a `smokescreen` sidecar, `worker/entrypoint.sh`), live on the
Railway worker service per [docs/ssrf-egress-hardening.md](docs/ssrf-egress-hardening.md).
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The hosted web app's engineering blockers are closed: durable rate limiting, a spend
cap, and worker network isolation are built. Before a public anonymous launch, finish
the env/host checklist in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Cost

`scan` costs zero model calls. A `run` with three personas is on the order of 65 model
calls (per-persona step budgets). The agent sends a bounded window of recent history rather than the full
transcript (`HISTORY_WINDOW` in `src/agent/engine.ts`), which keeps input tokens flat
across a run instead of growing with every step. Hosted runs reserve against the daily
model-call cap before enqueueing.

## Develop locally

```bash
pnpm install
cp .env.example .env                    # ANTHROPIC_API_KEY only for `run`/`generate`
pnpm exec playwright install chromium
pnpm dev -- scan https://example.com    # run the CLI from source
pnpm test                               # CLI/engine tests (vitest)
pnpm exec tsc --noEmit
cd web && pnpm test && pnpm lint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full pre-PR check and [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

MIT
