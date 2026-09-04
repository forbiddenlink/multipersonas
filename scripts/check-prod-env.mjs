#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const prod = args.has("--prod");
const envFileIndex = process.argv.indexOf("--env-path");
const envFile = envFileIndex >= 0 ? process.argv[envFileIndex + 1] : undefined;

function parseEnvFile(file) {
  if (!file) return {};
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = parseEnvFile(envFile);
const env = { ...process.env, ...fileEnv };
const failures = [];
const warnings = [];

function present(key) {
  return typeof env[key] === "string" && env[key].trim() !== "";
}

function requirePresent(key) {
  if (!present(key)) failures.push(`${key} is required`);
}

function redactedPlaceholder(key) {
  return present(key) && env[key].trim() === "[SENSITIVE]";
}

function requireNotRedacted(key) {
  if (redactedPlaceholder(key)) {
    failures.push(`${key} is a redacted placeholder; store NEXT_PUBLIC_* values as non-sensitive config`);
  }
}

function requireHttpsUrl(key) {
  if (present(key) && !env[key].startsWith("https://")) {
    failures.push(`${key} must be an https:// URL in production`);
  }
}

function hostAllowed(key, allowed) {
  if (!present(key)) return;
  try {
    const host = new URL(env[key]).host;
    if (!allowed.includes(host)) {
      failures.push(`${key} host must be one of: ${allowed.join(", ")}`);
    }
  } catch {
    failures.push(`${key} must be a valid URL`);
  }
}

if (prod) {
  requirePresent("NEXT_PUBLIC_SUPABASE_URL");
  requirePresent("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  requirePresent("SUPABASE_SERVICE_ROLE_KEY");
  requirePresent("NEXT_PUBLIC_SITE_URL");
  requirePresent("CRON_SECRET");

  requireNotRedacted("NEXT_PUBLIC_SUPABASE_URL");
  requireNotRedacted("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  requireNotRedacted("NEXT_PUBLIC_SITE_URL");
  requireNotRedacted("NEXT_PUBLIC_SENTRY_DSN");
  requireNotRedacted("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  requireNotRedacted("NEXT_PUBLIC_POSTHOG_KEY");
  requireNotRedacted("NEXT_PUBLIC_POSTHOG_HOST");

  requireHttpsUrl("NEXT_PUBLIC_SUPABASE_URL");
  requireHttpsUrl("NEXT_PUBLIC_SITE_URL");
  requireHttpsUrl("NEXT_PUBLIC_SENTRY_DSN");
  requireHttpsUrl("NEXT_PUBLIC_POSTHOG_HOST");
  hostAllowed("NEXT_PUBLIC_POSTHOG_HOST", ["us.i.posthog.com", "eu.i.posthog.com"]);
}

const hasTurnstileSiteKey = present("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
const hasTurnstileSecret = present("TURNSTILE_SECRET_KEY");
if (hasTurnstileSiteKey !== hasTurnstileSecret) {
  failures.push(
    "Turnstile is half-configured; set both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither",
  );
}

if (!hasTurnstileSiteKey && prod) {
  warnings.push("Turnstile is not configured; public grade/waitlist forms rely on rate limits only");
}

const hasPostHogKey = present("NEXT_PUBLIC_POSTHOG_KEY");
const hasPostHogHost = present("NEXT_PUBLIC_POSTHOG_HOST");
if (hasPostHogHost && !hasPostHogKey) {
  failures.push("PostHog is half-configured; set NEXT_PUBLIC_POSTHOG_KEY with NEXT_PUBLIC_POSTHOG_HOST, or neither");
}

if (!hasPostHogKey && prod) {
  warnings.push("PostHog is not configured; product analytics are disabled");
}

if (failures.length > 0) {
  console.error("Production env check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log("Production env check passed");
