# Host-agnostic audit worker. Runs anywhere that takes a container (Railway,
# Browserbase-adjacent host, Fly, etc.). Based on the Playwright image so Chromium +
# its system deps are already present — keep the tag in sync with the `playwright`
# version in the root package.json.

# --- stage: build the smokescreen egress-guard proxy from source ---
# Stripe ships no official binary/image, so build it in an isolated stage; only the
# compiled binary crosses into the runtime image (no Go toolchain in the final layer).
# See docs/ssrf-egress-hardening.md for why this exists (closes the DNS-rebinding
# SSRF TOCTOU that app-level url-guard.ts cannot close in-process).
FROM golang:1.23-bookworm AS smokescreen
RUN go install github.com/stripe/smokescreen@v0.0.5-0.20260819101244-f03c477dc9f4

FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app
# Process containment needs Linux subreaper support and process-tree inspection.
RUN apt-get update && apt-get install -y --no-install-recommends python3 procps && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Install deps against the lockfile first for layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/package.json
COPY worker/package.json ./worker/package.json
RUN pnpm install --frozen-lockfile

# Build the engine (root package -> dist), which the worker imports.
COPY . .
RUN pnpm --filter multipersonas build

# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and ANTHROPIC_API_KEY for the persona runs)
# are provided by the host environment, never baked into the image.

COPY --from=smokescreen /go/bin/smokescreen /usr/local/bin/smokescreen
COPY worker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/smokescreen

# Drop root: the Playwright base image ships a non-root `pwuser`. Chromium drives
# attacker-supplied pages, so a renderer exploit must not land as root next to the
# service-role + Anthropic keys. Chown the build output so the runtime user can read it.
# smokescreen listens on 127.0.0.1:4750, an unprivileged port, so it needs no root either.
RUN chown -R pwuser:pwuser /app
USER pwuser
CMD ["/usr/local/bin/entrypoint.sh"]
