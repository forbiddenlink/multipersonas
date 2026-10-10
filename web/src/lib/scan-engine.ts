/**
 * Facts about the scan engine that reports and the sample report state to readers.
 * axe-core is transitive via @axe-core/playwright in the root package; the value below is
 * what pnpm-lock.yaml resolves. scan-engine.test.ts fails when the two drift.
 */
export const AXE_CORE_VERSION = "4.13.0";

/** The WCAG version the conformance catalogue (wcag-catalog.ts) is sourced from. */
export const WCAG_VERSION = "2.2";
