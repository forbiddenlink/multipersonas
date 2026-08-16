# Closing the DNS-rebinding SSRF residual (worker egress)

Snapshot 2026-08-02, updated 2026-08-16. **Status: CLOSED, live in production.** The
worker image builds and backgrounds `smokescreen` (`worker/Dockerfile` +
`worker/entrypoint.sh`, option 1 below) — verified locally: proxies a public URL
(`200`) and denies `169.254.169.254` (`407`, "Deny: Not Global Unicast"). Both
`AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` and `AUDIT_REQUIRE_EGRESS_PROXY=1` are now
set on the Railway `multipersonas-worker` service; the redeployed container's logs
confirm smokescreen's own `[INFO] starting` line followed by a clean
`[worker] started; polling every 3000ms` boot, deployed in two phases (proxy first,
then fail-closed once the first was confirmed running) per `worker/README.md`.

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
connect, so audits **fail closed** rather than bypassing the guard. It also fails closed
BEFORE launch when `AUDIT_REQUIRE_EGRESS_PROXY=1` and the proxy var is unset/blank.

**a) DONE — smokescreen builds + runs in the worker container.** `worker/Dockerfile` has a
`golang:1.23-bookworm` build stage (`go install github.com/stripe/smokescreen@latest`); only
the compiled binary crosses into the runtime image. `worker/entrypoint.sh` backgrounds it on
`127.0.0.1:4750` (with `--deny-range 240.0.0.0/4`, see below) then execs the worker; the
image `CMD` and `railway.toml`'s `startCommand` both point at it. Verified locally (built +
ran the image): a request to `example.com` through the proxy returns `200`; a request to
`169.254.169.254` returns `407` with `decision_reason: "Deny: Not Global Unicast"` —
confirming smokescreen's default deny covers link-local/metadata with no ACL file needed.
For reference, this is what shipped:

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

**b) DONE — env set on the worker service (Railway `multipersonas-worker`):**
`AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` set + redeployed first; verified via
`railway logs` (smokescreen's `[INFO] starting` line, then a clean worker boot); THEN
`AUDIT_REQUIRE_EGRESS_PROXY=1` set (auto-triggered a second redeploy, also verified
clean). Both UNSET everywhere else (CLI, tests, local dev) so only the worker is
proxied.

Caveats (resolved): smokescreen flags verified against `smokescreen --help` (`--listen-ip`,
`--listen-port`, `--deny-range`, all repeatable/as documented) and confirmed working in a
local build+run (see status line at top). Keep the app-layer `url-guard` as the first gate
(it already blocks 240/4 and the rest, so it is the belt to smokescreen's suspenders).
Keeps the browser local (no per-scan latency), proven in production, minimal moving parts.

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

## Now that it's activated

The deployed url-guard + per-request `context.route` guards remain the first line of
defense (belt-and-suspenders); smokescreen closes the specific DNS-rebind TOCTOU they
cannot. If smokescreen or the proxy env var is ever removed from the Railway service by
accident, `AUDIT_REQUIRE_EGRESS_PROXY=1` makes the worker refuse to launch the browser
rather than silently reverting to a direct connection — watch worker logs / Sentry for
that error string if audits start failing after a config change.

## Recommendation

**Shipped: smokescreen as a worker sidecar (option 1), live on the Railway
`multipersonas-worker` service since 2026-08-16.** If it ever proves operationally
painful, option 2 (Browserbase) is the documented fallback; the app-layer url-guard
stays as the first line either way.
