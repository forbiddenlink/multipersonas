# Closing the DNS-rebinding SSRF residual (worker egress)

Snapshot 2026-08-02. Status: OPEN. The one security item the 2026-08-02 audit could not
close from the repo — it needs infra/network work on the worker host.

## The residual

`src/security/url-guard.ts` resolves the target hostname and validates the **resolved**
addresses before every navigation, and the engine + crawler + grader re-check every
in-flight request (`assertRequestAllowed` via `context.route`). That closes almost
everything. What remains is a TOCTOU: url-guard resolves DNS, then Chromium resolves the
hostname **again** when it actually connects. An attacker who controls DNS for a hostname
they submit can answer with a public IP on the first lookup (passes the guard) and a
private/metadata IP (`169.254.169.254`, RFC1918) on Chromium's second lookup. This is
documented at `url-guard.ts:174-179` and in `docs/DEPLOYMENT.md`.

The fix has to live **below** the app: the browser host must be unable to *reach* private
addresses at the network layer, so a rebind resolves to a destination the network drops.

## Options, best first

### 1. Smokescreen egress proxy sidecar (recommended)

Stripe's [smokescreen](https://github.com/stripe/smokescreen) is a purpose-built
SSRF-protection HTTP CONNECT proxy: it re-resolves and validates **every** connection
against a private-range denylist **at connect time**, which is exactly where the rebind
happens. By default it denies RFC1918, loopback (incl. `127.0.0.1`), link-local (incl.
`169.254.169.254`), CGNAT (`100.64/10`), and the IPv6 equivalents.

**The app side is already wired.** `src/security/browser.ts` (`launchAuditBrowser`) reads
`AUDIT_BROWSER_PROXY`; when set, every audit browser (crawler, grader, persona engine,
persona-gen, session) launches with `proxy.server` pointing at it. Unset (CLI/local) it is
a plain launch — no behaviour change off the worker. If the proxy is down the browser can't
connect, so audits **fail closed** rather than bypassing the guard.

So only two things are left, both on the worker container/host (untested here — verify the
Docker build + `smokescreen --help` flag names before relying on it):

**a) Build + run smokescreen in the worker container.** Smokescreen ships no official
binary or image, so build it from source with a multi-stage step, then run it as a second
process via an entrypoint. Add to `worker/Dockerfile`:

```dockerfile
# --- stage: build smokescreen from source (no official binary/image) ---
FROM golang:1.23-bookworm AS smokescreen
RUN go install github.com/stripe/smokescreen@latest   # -> /go/bin/smokescreen

# --- existing worker stage (FROM mcr.microsoft.com/playwright:...) ---
# ...after the existing build steps, before `USER pwuser`:
COPY --from=smokescreen /go/bin/smokescreen /usr/local/bin/smokescreen
COPY worker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/smokescreen
# ...keep `USER pwuser` (smokescreen on :4750 needs no root)...
CMD ["/usr/local/bin/entrypoint.sh"]
```

`worker/entrypoint.sh`:

```sh
#!/bin/sh
set -e
# Egress SSRF guard. Default-denies private/reserved ranges; ALSO deny Class E
# 240.0.0.0/4, which smokescreen default-ALLOWS (known DNS-rebind bypass, spearbit
# 2026-06-18). Backgrounded; the worker's browser egress goes through it via
# AUDIT_BROWSER_PROXY, so if it dies the browser can't connect (fail closed).
smokescreen --listen-ip 127.0.0.1 --listen-port 4750 --deny-range 240.0.0.0/4 &
exec pnpm --filter worker start
```

**b) Set the env on the worker (Railway):** `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750`.
Leave it UNSET everywhere else (CLI, tests) so only the worker is proxied.

Caveats: verify the exact smokescreen flags against `smokescreen --help` at build time;
keep the app-layer `url-guard` as the first gate (it already blocks 240/4 and the rest, so
it is the belt to smokescreen's suspenders). Keeps the browser local (no per-scan latency),
proven in production, minimal moving parts.

### 2. Sandboxed browser service (Browserbase / Browserless)

Offload the browser to a managed, network-isolated service over CDP. Removes the browser
from your network entirely, so there is nothing private for a rebind to reach. Simplest
operationally, but adds per-scan cost + latency and a third party in the audited-content
path. Good fallback if Railway can't run a sidecar.

### 3. Host firewall / network namespace

`iptables`/`nftables` rules on the worker host that DROP egress to
`10/8, 172.16/12, 192.168/16, 169.254/16, 127/8, ::1, fc00::/7, fe80::/10`. Airtight, but
managed Railway containers don't give you the network control to do this cleanly — usually
not an option without moving off managed hosting.

### 4. Pin the vetted IP in-process (partial)

Pass Chromium `--host-resolver-rules="MAP <host> <ip-url-guard-already-validated>"` so it
connects to the IP the guard approved, not a re-resolved one. Defeats rebinding without a
proxy, but is fiddly with a crawler visiting many hosts (rules must be rebuilt per target)
and does not guard subresources to other hosts. Weaker than option 1; note as a stopgap.

## Until it's closed

Keep the deployed url-guard + per-request `context.route` guards (they block the *common*
case; only an attacker-controlled DNS rebind slips through). If the public hosted product
is exposed before egress isolation lands, gate it behind Vercel Deployment Protection per
`docs/DEPLOYMENT.md`. The CLI is unaffected in practice (the operator points it at a target
they chose).

## Recommendation

Ship **smokescreen as a worker sidecar** (option 1). If Railway makes sidecars painful,
move the browser to **Browserbase** (option 2). Either closes the residual; the app-layer
url-guard stays as the first line.
