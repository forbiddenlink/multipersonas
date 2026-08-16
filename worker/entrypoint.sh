#!/bin/sh
set -e

# Egress SSRF guard (docs/ssrf-egress-hardening.md). Resolves + validates the
# destination at CONNECT time, closing the DNS-rebinding TOCTOU that
# src/security/url-guard.ts cannot close in-process (it resolves once, then
# Chromium resolves again on connect). Default-denies RFC1918, loopback,
# link-local (incl. 169.254.169.254 cloud metadata), and the IPv6 equivalents.
#
# ALSO deny Class E 240.0.0.0/4, which smokescreen does NOT deny by default
# (a documented DNS-rebind bypass — spearbit 2026-06-18).
#
# Backgrounded on localhost only (127.0.0.1), never exposed outside the
# container. The worker's browser egress routes through it via
# AUDIT_BROWSER_PROXY=http://127.0.0.1:4750 (src/security/browser.ts). If this
# process dies, the browser cannot connect, so audits fail CLOSED rather than
# silently bypassing the guard.
smokescreen --listen-ip 127.0.0.1 --listen-port 4750 --deny-range 240.0.0.0/4 &

exec pnpm --filter worker start
