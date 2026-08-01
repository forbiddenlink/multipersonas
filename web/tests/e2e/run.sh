#!/usr/bin/env bash
# Run the gated-app E2E against the LOCAL Supabase stack. Pulls the stack's env
# (URL + keys) from `supabase status`, seeds a test user + owned data, then runs
# Playwright. Requires `supabase start` to already be up in web/.
#
# Usage (from web/):  bash tests/e2e/run.sh [playwright args]
set -euo pipefail
cd "$(dirname "$0")/../.."   # -> web/

if ! supabase status >/dev/null 2>&1; then
  echo "Local Supabase is not running. Start it first: (cd web && supabase start)" >&2
  exit 1
fi

# Load the local stack's URL + keys (never printed).
eval "$(supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

pnpm exec tsx tests/e2e/seed.ts
pnpm exec playwright test "$@"
