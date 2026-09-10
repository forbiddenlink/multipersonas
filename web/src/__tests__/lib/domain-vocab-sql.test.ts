import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIT_JOB_STATUSES,
  FINDING_CATEGORIES,
  FINDING_STATUSES,
  SEVERITIES,
} from "@engine/domain/vocab";

function migration(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "supabase/migrations", name), "utf8");
}

function valuesFor(sql: string, column: string): string[] {
  const match = sql.match(new RegExp(`${column}[\\s\\S]*?check \\(${column} in \\(([^)]+)\\)`, "i"));
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe("SQL check constraints stay aligned with domain vocabularies", () => {
  it("keeps finding severity/category checks aligned", () => {
    const sql = migration("001_initial_schema.sql");
    expect(valuesFor(sql, "severity")).toEqual([...SEVERITIES]);
    expect(valuesFor(sql, "category")).toEqual([...FINDING_CATEGORIES]);
  });

  it("keeps audit job and finding workflow statuses aligned", () => {
    expect(valuesFor(migration("20260727014243_audit_jobs_queue.sql"), "status")).toEqual([
      ...AUDIT_JOB_STATUSES,
    ]);
    expect(
      valuesFor(migration("20260910120600_finding_workflow_and_scan_schedules.sql"), "status"),
    ).toEqual([...FINDING_STATUSES]);
  });
});
