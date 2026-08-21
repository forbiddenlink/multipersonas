export const SEVERITIES = ["critical", "serious", "moderate", "minor"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FINDING_CATEGORIES = ["accessibility", "usability", "performance", "content"] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export const FINDING_STATUSES = ["open", "assigned", "fixed", "accepted-risk", "false-positive"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const AUDIT_JOB_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type AuditJobStatus = (typeof AUDIT_JOB_STATUSES)[number];

const SEVERITY_ASCENDING: Severity[] = [...SEVERITIES].reverse();

export function isSeverity(value: string): value is Severity {
  return SEVERITIES.includes(value as Severity);
}

export function clampSeverity(value: string): Severity {
  return isSeverity(value) ? value : "moderate";
}

export function isFindingCategory(value: string): value is FindingCategory {
  return FINDING_CATEGORIES.includes(value as FindingCategory);
}

export function clampFindingCategory(value: string): FindingCategory {
  return isFindingCategory(value) ? value : "usability";
}

export function isFindingStatus(value: string): value is FindingStatus {
  return FINDING_STATUSES.includes(value as FindingStatus);
}

export function isAuditJobStatus(value: string): value is AuditJobStatus {
  return AUDIT_JOB_STATUSES.includes(value as AuditJobStatus);
}

export function severityRank(severity: Severity): number {
  const i = SEVERITIES.indexOf(severity);
  return i === -1 ? SEVERITIES.length : i;
}

export function severityAtLeast(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_ASCENDING.indexOf(severity) >= SEVERITY_ASCENDING.indexOf(threshold);
}
