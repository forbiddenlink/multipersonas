# Host-agnostic audit worker. Runs anywhere that takes a container (Railway,
# Browserbase-adjacent host, Fly, etc.). Based on the Playwright image so Chromium +
# its system deps are already present — keep the tag in sync with the `playwright`
# version in the root package.json.

# --- stage: build the smokescreen egress-guard proxy from source ---
# Stripe ships no official binary/image, so build it in an isolated stage; only the
# compiled binary crosses into the runtime image (no Go toolchain in the final layer).
# See docs/ssrf-egress-hardening.md for why this exists (closes the DNS-rebinding
# SSRF TOCTOU that app-level url-guard.ts cannot close in-process).
FROM golang:1.27-bookworm@sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5 AS smokescreen
RUN go install github.com/stripe/smokescreen@v0.0.5-0.20260819101244-f03c477dc9f4

FROM mcr.microsoft.com/playwright:v1.64.1-jammy@sha256:6075bd984554db82aee96bcdde53197f091dfe8c4b89322c61da77b86308b810

WORKDIR /app
# Process containment needs Linux subreaper support and process-tree inspection.
RUN apt-get update && apt-get install -y --no-install-recommends python3 procps && rm -rf /var/lib/apt/lists/*
# Build and runtime users must share the pinned package-manager download.
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable

# Install deps against the lockfile first for layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/package.json
COPY worker/package.json ./worker/package.json
RUN pnpm install --frozen-lockfile

# Build the engine (root package -> dist), which the worker imports.
COPY . .
RUN pnpm --filter personaudit --fail-if-no-match build

# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and ANTHROPIC_API_KEY for the persona runs)
# are provided by the host environment, never baked into the image.

COPY --from=smokescreen /go/bin/smokescreen /usr/local/bin/smokescreen
COPY worker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/smokescreen

# Separate uids (SEC-001). Chromium drives attacker-supplied pages, so a renderer exploit
# must land neither as root nor as the uid holding the service-role key. The entrypoint
# starts as root only to drop into: `mpworker` (the worker, holds the key), `pwuser` (the
# Playwright image's user, runs every scan and its Chromium), and `nobody` (smokescreen).
# `mpscan` is the one group the two share, for the per-job output directory.
# /app stays root-owned: no runtime uid can rewrite the code another uid runs.
RUN groupadd --system mpscan \
  && useradd --system --create-home --home-dir /home/mpworker --shell /usr/sbin/nologin --groups mpscan mpworker
CMD ["/usr/local/bin/entrypoint.sh"]
