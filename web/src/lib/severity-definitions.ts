import type { Severity } from "@/components/forensic/severity";

/**
 * One-line meaning of each severity level, as printed on the sample report. The levels are
 * axe-core's own `impact` ratings for a rule, so these describe the defect on the page. They
 * say nothing about a particular person or a persona.
 */
export const SEVERITY_DEFINITIONS: Record<Severity, string> = {
  critical: "Breaks a core control or content for assistive technology. Fix before release.",
  serious: "Creates a significant barrier to completing a task. Fix in the next release.",
  moderate: "Adds friction to a task. A workaround usually exists.",
  minor: "Small inconvenience. Low urgency.",
};
