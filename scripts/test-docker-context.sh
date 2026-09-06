#!/usr/bin/env bash
# Test Docker's real ignore semantics using synthetic canaries, never the repo context.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
mkdir -p "$test_dir/context/worker" "$test_dir/context/nested" "$test_dir/context/web/.vercel" "$test_dir/context/.vercel" "$test_dir/context/web/tests/e2e/.auth"
cp "$repo_dir/.dockerignore" "$test_dir/context/.dockerignore"
for canary in .env.production worker/.env.local nested/.env.test .vercel/.env.production.local .mpersonas-session.json nested/private.session.json web/.vercel/project.json web/tests/e2e/.auth/state.json; do
  echo synthetic-canary > "$test_dir/context/$canary"
done
echo source-control > "$test_dir/context/keep.txt"
cat > "$test_dir/Dockerfile" <<'DOCKERFILE'
FROM scratch
COPY . /context/
DOCKERFILE
docker build --network none -f "$test_dir/Dockerfile" --output "type=local,dest=$test_dir/output" "$test_dir/context" >/dev/null
if find "$test_dir/output" -type f -exec grep -l synthetic-canary {} + | grep -q .; then
  echo "FAIL: Docker context includes a credential/session canary" >&2
  exit 1
fi
test -f "$test_dir/output/context/keep.txt"
echo "Docker context credential exclusion passed"
