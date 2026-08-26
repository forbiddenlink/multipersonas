#!/usr/bin/env node

import { gzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const projectDir = path.resolve(process.argv[2] || "web");
const chunksDir = path.join(projectDir, ".next", "static", "chunks");
const budgetKb = Number(process.env.BUNDLE_GZIP_BUDGET_KB || 750);

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  console.error("BUNDLE_GZIP_BUDGET_KB must be a positive number");
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

if (!fs.existsSync(chunksDir)) {
  console.error(`No built Next chunks found at ${chunksDir}; run web build first`);
  process.exit(1);
}

let gzipBytes = 0;
for (const file of walk(chunksDir)) {
  gzipBytes += gzipSync(fs.readFileSync(file)).length;
}

const actualKb = gzipBytes / 1024;
if (actualKb > budgetKb) {
  console.error(
    `Bundle budget exceeded: ${actualKb.toFixed(1)} KB gzipped JS > ${budgetKb.toFixed(1)} KB`,
  );
  process.exit(1);
}

console.log(`Bundle budget passed: ${actualKb.toFixed(1)} KB gzipped JS <= ${budgetKb.toFixed(1)} KB`);
