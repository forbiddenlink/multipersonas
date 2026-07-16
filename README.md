# multipersonas

Point it at a URL. It launches a real browser, runs an axe-core accessibility scan,
and sends LLM-driven profiles to browse the site and report what they hit.

Two different things come out, and the distinction is the whole design:

- **Accessibility violations** come from **axe-core** — deterministic, citable, and
  the only thing here that touches compliance.
- **Usability friction** comes from **UX personas** (a first-time visitor, a mobile
  user on slow 3G). That output is *opinion*: jargon, buried pricing, tap targets.
  Useful, never compliance.

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

**Status: prototype, and the premise is under test.** The CLI works. The web app is
not deployed and cannot be deployed to Vercel as written — see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Whether the core bet (deep states hold
violations a URL scan misses) is even true is currently unmeasured — see
[docs/PLAN-2026-07-15-repositioning.md](docs/PLAN-2026-07-15-repositioning.md).

## Install

```bash
pnpm install
cp .env.example .env                    # ANTHROPIC_API_KEY required
pnpm exec playwright install chromium
```

## Use

```bash
# Run the three built-in profiles against a URL
pnpm dev -- run https://example.com

# Pick profiles, choose an output dir, skip the axe scan
pnpm dev -- run https://example.com --personas keyboard-traversal,first-time-visitor
pnpm dev -- run https://example.com --output ./report --no-axe

# Generate personas tailored to the site instead of using the built-ins
pnpm dev -- run https://example.com --count 4
pnpm dev -- run https://example.com --describe "B2B buyers evaluating enterprise software"

# Persona management
pnpm dev -- list                        # built-in + custom personas
pnpm dev -- generate https://example.com --count 4
pnpm dev -- create --from-json ./persona.json
pnpm dev -- delete <id>
```

Output is a Markdown + JSON report with per-persona scores, findings tagged by
severity and category, and screenshots of each step.

Built (`pnpm build`) the binary is `mpersonas`, so the same commands work as
`mpersonas run <url>`.

## How it works

```
URL ──> url-guard ──> Chromium ──> axe-core scan ─────────────┐
                          │                                    ├──> merged report
                          └──> persona agent (LLM) x N ────────┘
                               loop: snapshot page -> choose
                               tool -> act -> report findings
```

Each profile gets a system prompt built from its `kind`, goals, viewport, and input
modality (`src/personas/types.ts`). `kind: "ux"` produces a person with goals whose
output is opinion; `kind: "traversal"` produces a harness that is explicitly told it
is not a person and must not judge accessibility. The agent loop
(`src/agent/engine.ts`) hands the model an accessibility-tree snapshot each step and
lets it call `click`, `type`, `scroll`, `navigate`, `report_finding`, or
`mark_goal_complete`.

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

One audit with the three built-in personas is 65 sequential model calls (20 + 30 + 15
steps). The agent sends a bounded window of recent history rather than the full
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
