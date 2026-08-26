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

if (prod) {
  requirePresent("NEXT_PUBLIC_SUPABASE_URL");
  requirePresent("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  requirePresent("SUPABASE_SERVICE_ROLE_KEY");
  requirePresent("NEXT_PUBLIC_SITE_URL");

  requireNotRedacted("NEXT_PUBLIC_SUPABASE_URL");
  requireNotRedacted("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  requireNotRedacted("NEXT_PUBLIC_SITE_URL");
  requireNotRedacted("NEXT_PUBLIC_SENTRY_DSN");
  requireNotRedacted("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

  requireHttpsUrl("NEXT_PUBLIC_SUPABASE_URL");
  requireHttpsUrl("NEXT_PUBLIC_SITE_URL");
  requireHttpsUrl("NEXT_PUBLIC_SENTRY_DSN");
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

if (failures.length > 0) {
  console.error("Production env check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log("Production env check passed");
