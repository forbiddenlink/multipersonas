import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_LIMITS } from "@/lib/entitlements";
import { PROJECT_LIMIT_CODE, PROJECT_LIMIT_SQLSTATE } from "@/lib/project-limit";

const dir = path.join(process.cwd(), "supabase/migrations");
const file = fs.readdirSync(dir).find((f) => f.endsWith("_enforce_project_cap.sql"));
const sql = file ? fs.readFileSync(path.join(dir, file), "utf8") : "";

/** The `v_limit := case v_plan ... end;` block, as plan -> limit (null = unlimited). */
function sqlLimits(): { byPlan: Record<string, number | null>; fallback: number | null } {
  const block = /v_limit := case v_plan([\s\S]*?)end;/.exec(sql)?.[1] ?? "";
  const byPlan: Record<string, number | null> = {};
  for (const m of block.matchAll(/when '([^']+)' then (null|\d+)/g)) {
    byPlan[m[1]!] = m[2] === "null" ? null : Number(m[2]);
  }
  const other = /else (null|\d+)/.exec(block)?.[1];
  return { byPlan, fallback: other === undefined ? NaN : other === "null" ? null : Number(other) };
}

describe("project cap migration stays aligned with PROJECT_LIMITS", () => {
  it("exists", () => {
    expect(file).toBeDefined();
  });

  it("uses the same per-plan numbers as entitlements.ts", () => {
    const { byPlan } = sqlLimits();
    // free is the ELSE branch, so only the explicitly named plans appear here.
    expect(byPlan).toEqual({ team: PROJECT_LIMITS.team, pro: PROJECT_LIMITS.pro });
  });

  it("treats free and any unknown plan as the free limit", () => {
    expect(sqlLimits().fallback).toBe(PROJECT_LIMITS.free);
  });

  it("raises the error the app maps", () => {
    expect(sql).toContain(`raise exception '${PROJECT_LIMIT_CODE}'`);
    expect(sql).toContain(`errcode = '${PROJECT_LIMIT_SQLSTATE}'`);
  });
});
