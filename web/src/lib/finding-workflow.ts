export const FINDING_STATUSES = [
  "open",
  "assigned",
  "fixed",
  "accepted-risk",
  "false-positive",
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  fixed: "Fixed",
  "accepted-risk": "Accepted risk",
  "false-positive": "False positive",
};

export function isFindingStatus(value: string): value is FindingStatus {
  return FINDING_STATUSES.includes(value as FindingStatus);
}

export function resolvedAtForStatus(status: FindingStatus): string | null {
  return status === "fixed" || status === "accepted-risk" || status === "false-positive"
    ? new Date().toISOString()
    : null;
}
