# Open-source tools and academic projects comparable to Personaudit (as of 2026-10-10)

Scope note: star/push data below came from the GitHub REST API (`gh api repos/<owner>/<repo>`) on 2026-10-10, so each repo URL is the source. Feature detail came from README/doc fetches (cited per line). Firecrawl search returned HTTP 402 (out of credits), so discovery used WebSearch, `gh search repos`, and direct fetches. Local Personaudit facts are from reading `/Volumes/LizsDisk/multipersonas` (`src/cli.ts`, `action.yml`, `docs/github-action.md`, `examples/github-actions/accessibility-gate.yml`, `src/agent/engine.ts`).

## Q1. Comparable OSS tools and papers, and their adoption signals

### Takeaway
The deterministic-scan space is crowded and led by axe-core (7.6k stars), Pa11y (4.6k), Lighthouse CI (7.1k) and Unlighthouse (4.9k). The closest direct competitor in spirit is `github/accessibility-scanner` (382 stars, very active, shipped Oct 2026). LLM-persona usability testing is academic (UXAgent, AgentA/B) with small repos, so Personaudit's persona layer has little OSS competition but also little proven demand.

### Cited Findings
- pa11y: 4,572 stars, pushed 2026-09-28, LGPL-3.0 — [pa11y/pa11y](https://github.com/pa11y/pa11y)
- pa11y-ci: 638 stars, pushed 2026-10-07, LGPL-3.0 — [pa11y/pa11y-ci](https://github.com/pa11y/pa11y-ci)
- pa11y-dashboard: 1,094 stars, last push 2026-03-25 (slower), GPL-3.0 — [pa11y/pa11y-dashboard](https://github.com/pa11y/pa11y-dashboard)
- axe-core: 7,621 stars, pushed 2026-10-09, MPL-2.0 — [dequelabs/axe-core](https://github.com/dequelabs/axe-core)
- axe-core-npm (home of @axe-core/playwright, @axe-core/cli): 726 stars, pushed 2026-10-09 — [dequelabs/axe-core-npm](https://github.com/dequelabs/axe-core-npm)
- The standalone `axe-cli` repo is archived and marked Deprecated (438 stars, last push 2021-02-22) — [dequelabs/axe-cli](https://github.com/dequelabs/axe-cli)
- Lighthouse CI: 7,107 stars, last push 2026-03-27 (maintenance pace), Apache-2.0 — [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)
- Lighthouse: 30,874 stars, pushed 2026-10-10 — [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse)
- Unlighthouse: 4,891 stars, pushed 2026-10-10, runs Lighthouse across a whole site; one-command `npx unlighthouse --site <url>`, Node 22.18+ — [harlan-zw/unlighthouse](https://github.com/harlan-zw/unlighthouse)
- Sitespeed.io: 5,040 stars, pushed 2026-10-05, MIT; performance-focused, not an accessibility tool — [sitespeedio/sitespeed.io](https://github.com/sitespeedio/sitespeed.io)
- Accessibility Insights for Web: 955 stars, pushed 2026-10-03, MIT — [microsoft/accessibility-insights-web](https://github.com/microsoft/accessibility-insights-web). Service repo: 78 stars — [microsoft/accessibility-insights-service](https://github.com/microsoft/accessibility-insights-service). Action repo: 98 stars — [microsoft/accessibility-insights-action](https://github.com/microsoft/accessibility-insights-action). The action README says the ADO extension can scan a single page or crawl a site (static files, local server, or URLs), uses axe-core, and is "currently only available for Microsoft internal teams" — [README](https://github.com/microsoft/accessibility-insights-action)
- IBM Equal Access: 782 stars, pushed 2026-09-28, Apache-2.0. Node `accessibility-checker` works with Selenium, Puppeteer and Playwright and "provides the ability to validate results against baseline files"; also a Cypress wrapper and browser extension — [IBMa/equal-access](https://github.com/IBMa/equal-access)
- HTML_CodeSniffer: 1,146 stars, last push 2024-01-07 (effectively dormant) — [squizlabs/HTML_CodeSniffer](https://github.com/squizlabs/HTML_CodeSniffer). (`mattermost/html_codesniffer` returned 404; not a real path.)
- QualWeb: `qualweb/qualweb` 24 stars, pushed 2026-09-26; `qualweb/core` (12 stars) and `qualweb/cli` (13 stars) archived — [qualweb/qualweb](https://github.com/qualweb/qualweb)
- github/accessibility-scanner: 382 stars, pushed 2026-10-09, MIT, public preview, v3 — [github/accessibility-scanner](https://github.com/github/accessibility-scanner)
- Guidepup (real screen reader automation): 570 stars, pushed 2026-10-10, MIT — [guidepup/guidepup](https://github.com/guidepup/guidepup)
- browser-use: 117,527 stars, pushed 2026-10-09, MIT — [browser-use/browser-use](https://github.com/browser-use/browser-use)
- Stagehand: 25,611 stars, pushed 2026-10-10, MIT — [browserbase/stagehand](https://github.com/browserbase/stagehand)
- Skyvern: 23,178 stars, pushed 2026-10-10, AGPL-3.0 — [Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern)
- Magentic-UI (now describes MagenticLite): 10,092 stars, pushed 2026-09-23, MIT — [microsoft/magentic-ui](https://github.com/microsoft/magentic-ui)
- microsoft/playwright-mcp: 37,997 stars, pushed 2026-10-08, Apache-2.0 — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- UXAgent (paper): "UXAgent: A System for Simulating Usability Testing of Web Design with LLM Agents", Lu, Yao, Gu, Huang, Wang, Li, Gesi, He, Li, Wang; modules = Persona Generator, LLM Agent, Universal Browser Connector, plus a Result Viewer; heuristic evaluation with 16 UX researchers (qualitative praise plus concerns, no quantitative result in abstract) — [arXiv 2504.09407](https://arxiv.org/abs/2504.09407). An earlier framing paper exists: [arXiv 2502.12561](https://arxiv.org/abs/2502.12561)
- UXAgent repo: `neuhai/UXAgent`, 116 stars, last push 2025-11-05 (slowing) — [neuhai/UXAgent](https://github.com/neuhai/UXAgent)
- AgentA/B / Agent A/B (Northeastern, Penn State, Amazon; CHI EA '26 extended abstract per v4): 1,000-agent between-subjects test on Amazon.com, reduced filter list gave 414 vs 403 purchases, directionally matching a parallel human experiment; authors position it as complement to human testing — [arXiv 2504.09723](https://arxiv.org/abs/2504.09723). I found no public repo for AgentA/B (searched `gh search repos`; only unrelated hits).
- Accessibility MCP servers found: Deque's official `axe-mcp-server-public` (8 stars, pushed 2026-10-02, proprietary) — [repo](https://github.com/dequelabs/axe-mcp-server-public); `priyankark/a11y-mcp` (52 stars, pushed 2026-10-04) — [repo](https://github.com/priyankark/a11y-mcp); `ronantakizawa/a11ymcp` (92 stars, last push 2026-03-10) — [repo](https://github.com/ronantakizawa/a11ymcp); others listed on Glama (jbuchan, Duds, deepakkamboj) — [WebSearch result](https://glama.ai/mcp/servers/jbuchan/accessibility-mcp-server)
- No separate OSS repo found for "axe-reports" at `dequelabs/axe-reports-js` (404 on that path); not verified under another name.

### Inferences
- GitHub's own scanner (Oct 2026 activity, MIT, Copilot fix loop) is the main competitive threat to a "CI gate plus issues" positioning; Personaudit's differentiator there is baseline-based new-defect gating, keyless operation, and stable defect keys.
- Persona LLM testing has academic mindshare (UXAgent 116 stars) but nothing near the adoption of deterministic scanners. That supports the repo's own stance (scan is the core, personas are task-success only).

### Gaps
- Star counts were not tracked over time, so growth rates are unknown.
- AgentA/B repo not found; may not be released.
- Unlighthouse CI mode, budgets and sitemap behaviour not confirmed (README only; docs site not fetched).
- npm download counts not collected.

## Q2. Features: reporters, config, sitemap, thresholds, suppression, screenshots, fix guidance, dashboards, Docker

### Takeaway
Personaudit's gating core (baseline, `--fail-on`, exit 2 on new defects only, stable keys) is stronger than Pa11y CI's raw threshold. It lacks the surface area competitors have: multiple reporters (JSON/SARIF/JUnit/HTML), a config file, sitemap ingestion, per-rule ignore, element screenshots, auto-filed issues and PR comments.

### Cited Findings
- Local state: `scan` writes only `scan.md` (Markdown) to `--output`, plus a baseline JSON; `grade` has `--json`. Flags: `--session`, `--max-pages`, `--allow-private`, `--fail-on`, `--baseline`, `--update-baseline`. No sitemap, SARIF, JUnit, HTML, config-file or ignore flag found (`src/cli.ts` lines 88-97, 155-156, 219). The packaged `action.yml` exposes `url`, `fail-on`, `baseline`, `session`, `max-pages`, `report` and outputs `new-defects`, `report-path`; no PR comment or annotation step.
- Pa11y CI: config in `.pa11yci`, `.pa11yci.cjs/.js/.json` with `urls` plus `defaults` and per-URL overrides; `--sitemap` supports sitemap indexes, `--sitemap-find/--sitemap-replace` (rewrite prod host to localhost), `--sitemap-exclude` regex; built-in `cli` and `json` reporters plus custom npm/local reporters; `--threshold` (default 0) per run or per page; exit codes 0 pass, 1 technical fault, 2 threshold reached; `actions` array for pre-test steps; `concurrency`; per-page `screenCapture` — [pa11y-ci README](https://github.com/pa11y/pa11y-ci)
- Playwright axe patterns: `exclude()` skips elements and descendants for all rules; `disableRules()` for one rule with many preexisting violations; shared `makeAxeBuilder` fixture; `testInfo.attach()` for full scan JSON; docs recommend snapshotting a fingerprint (rule id plus selectors) rather than the whole violations array, since HTML snippets are fragile — [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- github/accessibility-scanner inputs: `urls` or per-URL `url_configs` (with `excludeSelectors`, `waitForSelectors`), `include_screenshots`, `group_by` (finding | rule | rule+url), `open_grouped_issues`, `file_best_practice_issues`, `file_experimental_issues`, `dry_run`, `reduced_motion`, `color_scheme`, `scans` plugin array (built-in `axe` and `accesslint`; extra plugins installed from npm; first-party Alt Text plugin flags weak alt text that `image-alt` accepts), `login_url/username/password` or `auth_context` (Playwright session state with cookies/localStorage for 2FA/SSO/passkeys). Recurring findings reopen closed issues; a `wontfix` label keeps one closed. Requires a fine-grained PAT (default `GITHUB_TOKEN` will not work) — [README](https://github.com/github/accessibility-scanner)
- Same scanner assigns issues to the Copilot coding agent to open fix PRs, steerable by `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, or `agents.md`; maintainers state it cannot guarantee accessible suggestions — [README](https://github.com/github/accessibility-scanner)
- Lighthouse CI: assertions and budgets, PR report, historical dashboard server, build-to-build comparison, repeated runs to reduce variance, `.lighthouserc.js`, `lhci autorun` — [README](https://github.com/GoogleChrome/lighthouse-ci)
- IBM Equal Access validates results against baseline files; also provides a `report-react` package (formats not confirmed from README) — [IBMa/equal-access](https://github.com/IBMa/equal-access)
- Pa11y Dashboard exists as a monitoring web UI (1,094 stars, GPL-3.0) — [pa11y-dashboard](https://github.com/pa11y/pa11y-dashboard)
- Deque `axe-mcp-server` runs via Docker (`dequesystems/axe-mcp-server`) and needs a paid Axe DevTools for Web subscription and API key — [README](https://github.com/dequelabs/axe-mcp-server-public)

### Inferences
- Suppression with expiry was not found in any fetched README (Pa11y, scanner, IBM, Lighthouse CI). It is an open lead position, not a catch-up item. Only `wontfix` labels (scanner) and axe `exclude`/`disableRules` (Playwright) exist.
- Sitemap ingestion plus host rewrite (`--sitemap-find/replace`) is a cheap, proven DX feature that fits preview-URL CI.
- The `url_configs` pattern (`excludeSelectors`, `waitForSelectors`) maps to Personaudit's crawler and would address SPAs where state appears after interaction.

### Gaps
- SARIF, JUnit, GitHub annotation and sticky PR comment support were not confirmed in any fetched competitor README; I cannot say whether axe-sarif or similar exist. Not researched further.
- Unlighthouse and Pa11y Dashboard feature details beyond one-line descriptions not retrieved.
- Docker images: only Deque's MCP server confirmed; Pa11y/IBM/Unlighthouse Docker status not verified.

## Q3. DX: install-to-first-report and docs patterns

### Takeaway
The best DX benchmark is a single command with no config. Unlighthouse is `npx unlighthouse --site <url>`; Personaudit is comparable (`npx personaudit scan <url>`) but its gating setup needs two extra steps (baseline commit, repo variable).

### Cited Findings
- Unlighthouse install-to-report: one command, `--debug` flag, Discord support, an "AI agent skill" offered — [README](https://github.com/harlan-zw/unlighthouse)
- UXAgent setup needs `uv sync`, `playwright install chromium`, API keys, and either a CLI invocation with `--intent` and `--start-url` or a Flask plus Node web wizard; README omits internals (memory, replay) — [README](https://github.com/neuhai/UXAgent)
- Personaudit's example workflow pins action SHAs and asks users to: commit baseline, set `PERSONAUDIT_TARGET_URL`, optionally store session JSON as a secret — `examples/github-actions/accessibility-gate.yml` (local). The packaged action builds the CLI from source each run (`pnpm install`, `pnpm build`, `playwright install`) per `action.yml`, which will be slower than a published-package or container action.
- GitHub scanner needs a fine-grained PAT and a cache key before first run, a heavier setup than a keyless gate — [README](https://github.com/github/accessibility-scanner)

### Inferences
- Time-to-first-report is a plausible differentiator if the action used the published `personaudit@0.1.0` npm package or a prebuilt image instead of a source build. This is an inference from `action.yml`; timing was not measured.

### Gaps
- No measured install-to-report timings for any tool.

## Q4. Agentic: reproducibility, cost bounds, replay

### Takeaway
None of the fetched agent repos documents strong replay or deterministic reproduction. The patterns worth copying are Stagehand's observe-then-act with caching and OTel traces, UXAgent's per-run folder of logs/screenshots/metrics, and Magentic-UI's approval and sandbox model.

### Cited Findings
- Stagehand: `observe()` returns real selectors so "credentials never reach the model"; server-side `cache: true` on Browserbase means identical calls return without token spend; OTel traces and session recordings; accessibility-tree trimming to reduce tokens; model gateway picks cheapest model per action. Determinism and evals not covered on the page — [README](https://github.com/browserbase/stagehand)
- UXAgent writes each run to `runs/<timestamp>` with logs, session traces, screenshots, aggregate metrics; supports `max_steps`, `concurrency`, and a post-run questionnaire in `runConfig.yaml`; persona sampling from weighted demographics. No replay feature documented — [README](https://github.com/neuhai/UXAgent)
- Magentic-UI/MagenticLite: user can steer, approve, take over; agent checks in before critical actions; browser sessions in a lightweight VM sandbox (Quicksand) — [README](https://github.com/microsoft/magentic-ui)
- browser-use: README documents a `history` object from `agent.run()` and a separate benchmark repo; does not mention replay, GIF, traces or cost tracking in the fetched page — [README](https://github.com/browser-use/browser-use)
- Personaudit engine: bounded history (`HISTORY_WINDOW = 12`), per-persona `maxSteps`, page content fenced as `<untrusted-page-content>` (prompt-injection guard), explicit stuck/finish handling — `src/agent/engine.ts` lines 193, 836, 854, 910 (local). I did not find Playwright trace/video recording or token/cost budget flags in `src/cli.ts` (grep for `trace`, `video`, `budget` hit only a page budget at line 162).
- AgentA/B scale claim: 1,000 LLM agents in one study — [arXiv 2504.09723](https://arxiv.org/abs/2504.09723)

### Inferences
- A per-run directory holding action log JSONL, Playwright trace.zip and token usage would match UXAgent and exceed browser-use/Stagehand OSS docs on replayability. Playwright trace viewer gives replay at no build cost (inference; not verified against Personaudit's browser setup).
- Because Personaudit already sets step caps and a history window, adding a `--max-cost` or `--max-tokens` cap is a small extension that no fetched competitor advertises.

### Gaps
- Stagehand auto-caching internals, browser-use history/replay, Skyvern observability and Magentic-UI action-guard details were not read at doc level.
- No verified evidence on how reproducible any LLM persona run is across repeats.

## Q5. MCP server for Personaudit: do competitors have one, what would it look like

### Takeaway
Yes, accessibility MCP servers exist but are thin single-page axe wrappers. Nobody found offers crawl, baseline diffing or stable-key defect tracking over MCP, which is where Personaudit can lead.

### Cited Findings
- `priyankark/a11y-mcp` exposes `audit_webpage` (`url`, `includeHtml`, `tags` such as wcag2a/wcag2aa/wcag21a/best-practice) and `get_summary` (`url`); `npx a11y-mcp`; Node 22.12+ — [README](https://github.com/priyankark/a11y-mcp)
- Deque official axe MCP server exposes `analyze` and `remediate` (AI code-level fix guidance for coding agents); proprietary; Docker; needs paid subscription and API key; works with Claude Desktop, VS Code, Cursor — [README](https://github.com/dequelabs/axe-mcp-server-public)
- jbuchan/accessibility-mcp-server: tools `test_accessibility`, `get_test_results`, `list_test_results`; blocks local/private addresses by default; Chromium/Firefox/WebKit — [Glama listing](https://glama.ai/mcp/servers/jbuchan/accessibility-mcp-server)
- Duds/accessibility-mcp combines axe via Playwright, Lighthouse CLI and optional WAVE API, `axe_audit` accepts URLs, localhost or local HTML files — [Glama listing](https://glama.ai/mcp/servers/Duds/accessibility-mcp)
- Playwright MCP (37,997 stars) is the general browser-driving server for agents — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

### Inferences
- A Personaudit MCP could expose: `scan_site` (crawl, returns defect list with stable keys), `compare_to_baseline` (new vs fixed), `get_defect` (selector, WCAG criterion, fix guidance), `update_baseline` (explicit, confirmation-gated), `list_runs`, `run_persona_task` (optional, keyed, cost-capped). Resources: the latest `scan.md` and baseline file. This is a design proposal, not a competitor feature.
- Reuse the SSRF guard (`src/security/url-guard.ts`) and `--allow-private` as an explicit tool argument defaulting false, matching jbuchan's private-address block. Session files are credential-equivalent per the repo CLAUDE.md, so the MCP should accept a session path, never inline cookies.
- The local-dev loop (agent edits code, rescans localhost, sees only NEW defects) is the unique value. Existing servers return the whole page's violations each time.

### Gaps
- Star counts for Duds, jbuchan, deepakkamboj servers not retrieved (Glama listings only).
- axe-devtools-mcp (from WebSearch snippet) source repo not identified.

## Q6. Where Personaudit can lead

### Takeaway
Lead on: new-defect gating with stable keys across frameworks, behind-login crawl in CI, suppression with expiry, and an agent-facing MCP. Avoid competing head-on with GitHub's scanner on issue filing or Copilot fixes.

### Cited Findings
- Playwright docs themselves warn that snapshotting full violations arrays is fragile and recommend rule-id plus selector fingerprints — [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing). Personaudit's `src/agent/defect-key.ts` already collapses framework-generated ids (per repo CLAUDE.md), which is a more developed answer.
- Playwright ARIA snapshots (YAML, `toMatchAriaSnapshot`, `.aria.yml`, regex names) are a structural-regression primitive distinct from axe — [Playwright docs](https://playwright.dev/docs/aria-snapshots)
- Guidepup automates real VoiceOver (macOS) and NVDA (Windows) and ships a virtual screen reader, `@guidepup/playwright`, and `@guidepup/setup` for CI — [README](https://github.com/guidepup/guidepup)
- GitHub's scanner `wontfix` label is its only suppression mechanism found — [README](https://github.com/github/accessibility-scanner)

### Inferences
- Combining a stable-key baseline with per-rule or per-key suppression that carries `reason`, `owner`, `expires` would be unique among fetched tools.
- Optional Guidepup/virtual-screen-reader output as an extra check lane is possible but heavy (macOS/Windows runners); lower priority.
- Copilot-style auto-fix is crowded; instead emit fix guidance in a structured form that any coding agent (via MCP) can consume.

### Gaps
- No usage data showing demand for suppression-with-expiry.
- Marketing claim risk: repo CLAUDE.md says personas do not out-find a crawler at a11y defects; keep persona claims to task success.

---

## Prioritized list for the CLI/engine and integrations

### Missing (competitors have it, Personaudit does not)
1. Machine-readable reporters: JSON for `scan`, SARIF (GitHub code scanning), JUnit; plus HTML. Currently only `scan.md` (`src/cli.ts:155`). Pa11y CI ships `cli`/`json` plus pluggable reporters.
2. Sitemap ingestion with exclude regex and host rewrite (Pa11y CI `--sitemap`, `--sitemap-exclude`, `--sitemap-find/replace`).
3. Config file (`personaudit.config.*`) with defaults and per-URL overrides (`excludeSelectors`, `waitForSelectors`, pre-test actions), as in Pa11y CI and github/accessibility-scanner `url_configs`.
4. PR feedback: GitHub annotations and a sticky PR comment listing new/fixed defects. The action has outputs only (`new-defects`, `report-path`).
5. Ignore/allowlist rules (axe `exclude`/`disableRules` equivalents).

### Should add (new capability where Personaudit can lead)
1. Suppression with expiry, reason and owner, keyed on the stable defect key, failing the gate when an entry expires.
2. MCP server (`scan_site`, `compare_to_baseline`, `get_defect`, `update_baseline` with confirmation, `list_runs`), localhost-aware, SSRF guard on by default.
3. Element screenshots/highlight attached to each defect (scanner has `include_screenshots`; Pa11y has `screenCapture`).
4. Per-run artifact folder for `run`: action log, Playwright trace.zip, screenshots, token usage (UXAgent pattern); `--max-cost`/`--max-tokens` cap.
5. Fix guidance per defect in structured JSON (rule help URL, selector, suggested change) for coding agents.

### Should improve (exists, can be better)
1. Packaged action: avoid building from source every run (`action.yml` runs `pnpm install` and `pnpm build`); use the published npm package or a prebuilt image and cache the Playwright browser.
2. Exit-code contract documentation: keep 0 pass, 2 new defects, and add 1 for technical fault if not already distinct, mirroring Pa11y CI.
3. Baseline hygiene: report "fixed since baseline" in the PR comment and refuse stale baselines (cf. fingerprint advice in Playwright docs).
4. Session handling: document rotation and expiry; accept Playwright storage-state shape compatible with `auth_context`-style inputs so users can reuse existing Playwright auth setups.
5. Persona claims: keep README/web copy to task success, consistent with the repo's own experiments.

### Should create (new artifacts)
1. A Docker image (CLI plus Chromium) for CI and for the MCP server.
2. A trend/history view or JSON history file (Lighthouse CI server idea; Pa11y Dashboard) to track new vs fixed defects over time.
3. A quickstart page benchmarked against `npx unlighthouse --site <url>`: one command, report path printed, time target stated.
4. Optional plugin interface for extra checks (scanner's `scans` array, e.g. alt-text quality) so persona and heuristic checks can plug into the same defect model.
5. A documented comparison page versus github/accessibility-scanner, Pa11y CI and Axe MCP (positioning: keyless, new-defect gate, behind-login, stable keys).
