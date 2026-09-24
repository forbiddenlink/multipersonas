#!/usr/bin/env node
/* global AbortSignal, fetch */

const baseUrl = (process.env.SMOKE_BASE_URL || "https://personaudit.com").replace(/\/$/, "");
const checks = [];

async function check(name, run) {
  try {
    await run();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(Number(process.env.SMOKE_TIMEOUT_MS || 10000)),
  });
}

function expectStatus(res, allowed) {
  if (!allowed.includes(res.status)) {
    throw new Error(`expected ${allowed.join("/")} from ${res.url}, got ${res.status}`);
  }
}

await check("health reports database and queue ok", async () => {
  const res = await fetchWithTimeout(`${baseUrl}/api/health`, { cache: "no-store" });
  expectStatus(res, [200]);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(`health status was ${json.status}`);
  if (json.checks?.database !== "ok") throw new Error("database health was not ok");
  if (json.checks?.queue !== "ok") throw new Error("queue health was not ok");
});

for (const path of ["/", "/grade", "/for-agencies", "/pricing", "/docs", "/auth/login"]) {
  await check(`GET ${path}`, async () => {
    const res = await fetchWithTimeout(`${baseUrl}${path}`);
    expectStatus(res, [200]);
  });
}

await check("protected app redirects to login", async () => {
  const res = await fetchWithTimeout(`${baseUrl}/dashboard`, { redirect: "manual" });
  expectStatus(res, [307, 308]);
  const location = res.headers.get("location") || "";
  if (!location.includes("/auth/login")) {
    throw new Error(`expected /auth/login redirect, got ${location || "(missing location)"}`);
  }
});

const failed = checks.filter((c) => !c.ok);
for (const result of checks) {
  if (result.ok) {
    console.log(`PASS ${result.name}`);
  } else {
    console.error(`FAIL ${result.name}: ${result.error}`);
  }
}

if (failed.length > 0) process.exit(1);
