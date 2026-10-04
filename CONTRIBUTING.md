# Contributing

Personaudit is currently solo-maintained (Elizabeth Stein). Issues and PRs are
welcome; there is no formal process yet, so open an issue first for anything non-trivial.

## Layout

- `src/` — the `personaudit` CLI (TypeScript, published as the `personaudit` npm package).
- `web/` — the Next.js web app (a separate workspace; own `package.json`).
- `worker/` — the persistent job runner that executes browser audits.
- `experiments/` — kept on purpose: the evidence behind the product's claims (do not delete).

## Running it locally

```bash
pnpm install
pnpm exec playwright install chromium
# scan needs no API key:
pnpm dev -- scan https://example.com
# run/generate use personas and need ANTHROPIC_API_KEY in .env:
pnpm dev -- run https://example.com --count 3
```

Two entry points: `pnpm dev -- <cmd>` runs from source; after `npm i -g personaudit`
the installed binary is `personaudit <cmd>` (the legacy alias `mpersonas` also works).

## Before opening a PR

```bash
pnpm lint
pnpm exec tsc --noEmit          # source
pnpm typecheck:test             # tests (a separate config; the build tsconfig excludes them)
pnpm test
# web/ has its own: cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build
```

CI (`.github/workflows/ci.yml`) runs all of the above on every PR to `main`. The
`a11y-dogfood` workflow scans the site with the product's own axe ruleset and fails on any
violation — an accessibility tool that ships accessibility defects is off-brand.

## Library use

`package.json` exposes subpath exports (`./orchestrator`, `./engine`, `./personas/*`,
`./grader`). They are used internally by `web/` + `worker/`; treat them as unstable until
documented.

## Honesty constraints

These are product rules, not style. A PR that breaks one will not merge.

- No compliance claims. Automated checks find a subset of WCAG failures; never write "compliant".
- No disability simulation. Personas never role-play a disabled user (`src/personas/framing.test.ts` enforces it).
- No hosted behind-login claims. Behind-login scanning is the local CLI only.
