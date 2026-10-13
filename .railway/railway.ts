import { defineRailway, github, preserve, project, service } from "railway/iac";

// Replaces railway.toml (Config as Code, hard cutoff 2026-12-01).
// Audit worker (worker/README.md). The build context is the repo ROOT (the
// Dockerfile pulls in the engine + the worker package). Background process: no
// HTTP port, no healthcheck.
// Variables stay on Railway (preserve()); see worker/README.md for the list.
export const partial = "multipersonas-worker";

export default defineRailway(() => {
  const multipersonasWorker = service("multipersonas-worker", {
    source: github("forbiddenlink/multipersonas", { checkSuites: false }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "worker/Dockerfile",
    },
    // The image's own ENTRYPOINT (worker/entrypoint.sh) backgrounds smokescreen,
    // then execs the worker. startCommand must point at it or Railway's override
    // skips smokescreen entirely and silently reverts to a direct, unguarded
    // browser launch.
    start: "/usr/local/bin/entrypoint.sh",
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    replicas: { "us-west2": 1 },
    env: {
      ANTHROPIC_API_KEY: preserve(),
      AUDIT_BROWSER_PROXY: preserve(),
      AUDIT_REQUIRE_EGRESS_PROXY: preserve(),
      SENTRY_DSN: preserve(),
      SUPABASE_SERVICE_ROLE_KEY: preserve(),
      SUPABASE_URL: preserve(),
    },
  });

  return project("multipersonas-worker", {
    resources: [multipersonasWorker],
  });
});
