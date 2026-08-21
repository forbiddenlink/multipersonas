import { FINDING_STATUSES, isFindingStatus, type FindingStatus } from "@engine/domain/vocab";

export { FINDING_STATUSES, isFindingStatus, type FindingStatus };

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  fixed: "Fixed",
  "accepted-risk": "Accepted risk",
  "false-positive": "False positive",
};

export function resolvedAtForStatus(status: FindingStatus): string | null {
  return status === "fixed" || status === "accepted-risk" || status === "false-positive"
    ? new Date().toISOString()
    : null;
}
