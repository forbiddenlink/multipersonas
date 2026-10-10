import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.join(process.cwd(), "supabase/migrations");
const file = fs.readdirSync(dir).find((f) => f.endsWith("_report_share_links.sql"));
const raw = file ? fs.readFileSync(path.join(dir, file), "utf8") : "";
// Code only: the header comments describe what the functions avoid.
const sql = raw.replace(/--.*$/gm, "");

describe("report share links migration", () => {
  it("exists with a timestamped name", () => {
    expect(file).toMatch(/^\d{14}_report_share_links\.sql$/);
  });

  it("is additive only", () => {
    expect(sql).not.toMatch(/\bdrop\s+(table|column|policy|function|index|constraint)\b/i);
    expect(sql).not.toMatch(/\balter\s+column\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b|\btruncate\b|\bupdate\s+public\./i);
    expect(sql).not.toMatch(/\bcreate\s+policy\b/i);
  });

  it("never selects *, and never names owner, token or billing columns in a return list", () => {
    expect(sql).not.toMatch(/select\s+\*/i);
    expect(sql).not.toMatch(/\.\*/);
    for (const fn of sql.split(/create or replace function/i).slice(1)) {
      const returns = /returns\s+(?:table\s*\(([\s\S]*?)\)|uuid)/i.exec(fn)?.[1] ?? "";
      for (const banned of ["user_id", "email", "share_token", "stripe", "plan", "project_id", "screenshot", "reasoning"]) {
        expect(returns, `${banned} in a return list`).not.toContain(banned);
      }
    }
  });

  it("keeps the resolver private and grants the redeem functions to API roles only", () => {
    expect(sql).toMatch(/revoke all on function public\._shared_run_id\(text\) from public, anon, authenticated/);
    for (const name of ["get_shared_report", "get_shared_report_findings", "get_shared_report_journey"]) {
      expect(sql).toContain(`grant execute on function public.${name}(text) to anon, authenticated`);
    }
    expect(sql).not.toMatch(/grant\s+select/i);
  });

  it("pins search_path on every security definer function", () => {
    const fns = sql.split(/create or replace function/i).slice(1);
    expect(fns.length).toBe(4);
    for (const fn of fns) {
      expect(fn).toMatch(/security definer/i);
      expect(fn).toMatch(/set search_path = public/i);
    }
  });
});
