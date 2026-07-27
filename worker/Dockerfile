# Host-agnostic audit worker. Runs anywhere that takes a container (Railway,
# Browserbase-adjacent host, Fly, etc.). Based on the Playwright image so Chromium +
# its system deps are already present — keep the tag in sync with the `playwright`
# version in the root package.json.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app
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
CMD ["pnpm", "--filter", "worker", "start"]
