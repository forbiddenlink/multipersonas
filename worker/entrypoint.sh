#!/bin/sh
set -e

# Egress SSRF guard (docs/ssrf-egress-hardening.md). Resolves + validates the
# destination at CONNECT time, closing the DNS-rebinding TOCTOU that
# src/security/url-guard.ts cannot close in-process (it resolves once, then
# Chromium resolves again on connect). Keep these ranges explicit so the
# deployed guard does not depend on smokescreen defaults or hostname ACL config.
#
# Backgrounded on localhost only (127.0.0.1), never exposed outside the
# container. The worker's browser egress routes through it via
# AUDIT_BROWSER_PROXY=http://127.0.0.1:4750 (src/security/browser.ts). If this
# process dies, the browser cannot connect, so audits fail CLOSED rather than
# silently bypassing the guard.
DENY_RANGES="
  --deny-range 0.0.0.0/8
  --deny-range 10.0.0.0/8
  --deny-range 100.64.0.0/10
  --deny-range 127.0.0.0/8
  --deny-range 169.254.0.0/16
  --deny-range 172.16.0.0/12
  --deny-range 192.0.0.0/24
  --deny-range 192.0.2.0/24
  --deny-range 192.88.99.0/24
  --deny-range 192.168.0.0/16
  --deny-range 198.18.0.0/15
  --deny-range 198.51.100.0/24
  --deny-range 203.0.113.0/24
  --deny-range 224.0.0.0/4
  --deny-range 240.0.0.0/4
  --deny-range ::/128
  --deny-range ::1/128
  --deny-range 64:ff9b::/96
  --deny-range 2002::/16
  --deny-range fc00::/7
  --deny-range fe80::/10
  --deny-range fec0::/10
  --deny-range ff00::/8
"

smokescreen --listen-ip 127.0.0.1 --listen-port 4750 $DENY_RANGES &

exec pnpm --filter worker start
