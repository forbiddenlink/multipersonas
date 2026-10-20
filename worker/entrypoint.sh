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

# SEC-001: the worker holds SUPABASE_SERVICE_ROLE_KEY, and Chromium renders stranger-supplied
# pages. They must not share a uid, or a renderer exploit reads the key from the worker's
# /proc/<pid>/environ or memory. So this script starts as root only to hand out three
# identities, then drops root for good:
#   nobody   - smokescreen, with an empty environment
#   mpworker - the worker, holding the key, keeping only setuid/setgid/kill so it can start
#              each scan as pwuser and stop it
#   pwuser   - every scan and its Chromium, with no capabilities and no_new_privs
#              (worker/src/job-process.ts), and only the mpscan group for its output dir
# The worker re-checks the split at boot (assertScanIsolation) and exits if it does not hold.
if [ "$(id -u)" != "0" ]; then
  echo "[entrypoint] must start as root to split the worker and scan uids (SEC-001); refusing to run scans as the key-holding user" >&2
  exit 1
fi

export AUDIT_BROWSER_PROXY="${AUDIT_BROWSER_PROXY:-http://127.0.0.1:4750}"
export AUDIT_REQUIRE_EGRESS_PROXY=1
AUDIT_SCAN_UID="$(id -u pwuser)"
AUDIT_SCAN_GID="$(getent group mpscan | cut -d: -f3)"
AUDIT_SCAN_HOME="$(getent passwd pwuser | cut -d: -f6)"
export AUDIT_SCAN_UID AUDIT_SCAN_GID AUDIT_SCAN_HOME
export AUDIT_REQUIRE_SCAN_ISOLATION=1

setpriv --reuid=nobody --regid=nogroup --clear-groups --inh-caps=-all --bounding-set=-all --no-new-privs -- \
  env -i PATH="$PATH" smokescreen --listen-ip 127.0.0.1 --listen-port 4750 $DENY_RANGES &

# Arguments replace the worker command under the same identity (the image's isolation check
# in CI uses this). Railway's start command passes none.
if [ "$#" -eq 0 ]; then set -- pnpm --filter worker start; fi
exec setpriv --reuid=mpworker --regid=mpworker --init-groups \
  --inh-caps=-all,+setuid,+setgid,+kill --ambient-caps=-all,+setuid,+setgid,+kill \
  --bounding-set=-all,+setuid,+setgid,+kill -- \
  env HOME=/home/mpworker USER=mpworker LOGNAME=mpworker "$@"
