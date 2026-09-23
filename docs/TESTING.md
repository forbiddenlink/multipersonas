# Testing browser conditions and authenticated flows

## Browser-condition regression tests

Run `pnpm exec playwright install chromium`, then `pnpm test:browser`. CI installs
Chromium with its system dependencies and runs this suite explicitly. These tests
use disposable pages and a local HTTP fixture; they make no model calls and need
no accounts. The default unit suite skips this opt-in browser file.

Keyboard profiles use real Tab navigation, Enter/Space activation, text-entry
keys, native-select type-ahead, and arrow-key scrolling. Tests cover pointer-free
activation, controls outside the tab order, a focus trap, typing, checkboxes,
native selections, direct-navigation rejection, and the irreversible-action
guard. A search stops after 60 Tab presses or approximately five seconds. Failure
means this bounded search did not reach the control, not that all keyboard paths
are impossible. Complex composite widgets and alternative key paths are not
exhaustively explored; this is not a conformance test.

Network profiles use Chromium CDP before the first navigation. `3g` applies
100 ms latency, 750 kbit/s download, and 250 kbit/s upload; `slow-3g` applies
400 ms latency and 400 kbit/s in both directions. `fast` adds no throttling.
Throttled runs bypass service workers and disable cache. These are reproducible
synthetic conditions, not a claim to reproduce a particular carrier or device.
The browser fixture verifies actual transfer delay across two navigations while
request interception is active. Unit tests verify configuration ordering and
that installation failure aborts the run. Production's separate SSRF and egress
guards remain required.

Implementation references: [Playwright keyboard events](https://playwright.dev/docs/api/class-keyboard),
[Chromium network emulation](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-emulateNetworkConditionsByRule).

## Testing against a real, login-gated app

The product's whole claim is that personas reach states behind a login wall. You
cannot check that against a marketing page, so there is a disposable fixture: a
local Metabase container we own, seeded with known accounts.

Metabase is a good target because it is a real application with real
interactions — dashboards, filters, a query builder, an admin section — rather
than a page of marketing copy.

## Create the fixture

```bash
docker run -d --name mp-metabase-test -p 3010:3000 \
  -e MB_ANON_TRACKING_ENABLED=false metabase/metabase:latest
# It boots slowly. Wait for a 200:
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3010/api/health
```

Then seed the accounts. This writes `.env.local` (gitignored, mode 0600) with a
generated admin password and a generated persona-user password. Neither is ever
printed — a password echoed to a terminal is a password in an AI's context.

Accounts created:

| Account | Role | Used for |
|---|---|---|
| `purplegumdropz@gmail.com` | admin | You, in a browser |
| `persona@mp.test` | normal user | Personas |

Personas browse as the **non-admin** user on purpose. An agent clicking freely
through Metabase's admin section can wreck the fixture it is auditing.

## Capture a session

The real path is `mpersonas auth <url>`: a browser opens, a human logs in, and
only the resulting session is saved. For unattended runs (dogfooding, the
experiments in `experiments/`), there is a scripted equivalent that reads the
fixture credentials from `.env.local`:

```bash
npx tsx scripts/fixture-session.ts            # persona user (default)
npx tsx scripts/fixture-session.ts --admin    # admin
```

Both write `.mpersonas-session.json` at mode 0600. That file is
credential-equivalent: anyone holding it is signed in as that user. It is
gitignored, and `mpersonas run` refuses it if other users can read it.

## Run an audit

```bash
npx tsx src/cli.ts run http://localhost:3010 \
  --count 3 --allow-private --session .mpersonas-session.json
```

`--allow-private` is required for a localhost target and is CLI-only; the hosted
service must never set it, because there the URL comes from a stranger.

## What a good run looks like

Signed out, the audit sees `/auth/login` and nothing else. Signed in, the same
target yields roughly ten distinct application states, including ones no crawler
produces — a dashboard with filters applied through the UI, for instance:

```
/dashboard/1-e-commerce-insights?product_category=Doohickey&tab=1-overview
```

axe finds 2 violations at the login page and 8 inside the app. That gap is the
measurement the product exists to make.

## Persona permissions must match the session

Generated personas do not know what the session can do. Point an admin-shaped
persona at a non-admin session and every one of her findings is a variation of
"I am not an admin" — true, useless, and it drags the score to zero. If you
generate a persona whose goals need elevated rights, give the run an admin
session (`--admin` above), or discard that persona.

This is a known gap, not a subtlety of the fixture: the product has no idea what
role its session holds.

## Tear down

```bash
docker rm -f mp-metabase-test && rm -f .env.local .mpersonas-session.json
```

The container is disposable and holds nothing worth keeping. Note the two other
Metabase containers on this machine are **not** fixtures: `metabase-eval` (:3000)
is an evaluation instance, and `crc-metabase-pilot` (:3030) is CyberReady Clinic
client property — never a test target.
