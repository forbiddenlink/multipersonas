import { z } from "zod";

const coverageSchema = z.object({
  checks: z.array(z.object({
    url: z.string(),
    step: z.number().int().nonnegative(),
    status: z.enum(["scanned", "failed"]),
    error: z.string().optional(),
  })),
  executionFailures: z.array(z.object({ url: z.string(), error: z.string() })),
});

export type ScanCoverage = z.infer<typeof coverageSchema>;

export function parseScanCoverage(value: unknown): ScanCoverage | null {
  const parsed = coverageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function hasCompleteScanCoverage(coverage: ScanCoverage | null | undefined): boolean {
  return Boolean(coverage && coverage.checks.some((check) => check.status === "scanned") &&
    coverage.checks.every((check) => check.status === "scanned") && coverage.executionFailures.length === 0);
}

export function scanCoverageLines(coverage: ScanCoverage | null | undefined): string[] {
  if (!coverage) return ["Scan coverage was not recorded for this run."];
  const scanned = coverage.checks.filter((check) => check.status === "scanned").length;
  const failed = coverage.checks.filter((check) => check.status === "failed");
  return [
    `${hasCompleteScanCoverage(coverage) ? "Scan coverage" : "Scan coverage incomplete"}: ${scanned} successful checks, ${failed.length} failed checks, ${coverage.executionFailures.length} execution failures.`,
    ...failed.map((check) => `Failed check at ${check.url} (step ${check.step}): ${check.error || "No reason recorded"}`),
    ...coverage.executionFailures.map((failure) => `Execution failed at ${failure.url}: ${failure.error}`),
  ];
}
