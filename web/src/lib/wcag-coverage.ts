import type { CatalogCriterion } from "./conformance";
import { WCAG22_AA_CATALOG } from "./wcag-catalog";

/**
 * What axe-core can say about each WCAG 2.2 A/AA success criterion. Three kinds, and every
 * criterion in the catalog belongs to exactly one:
 *
 * - `axe`           at least one axe-core rule that runs in our scans emits this criterion.
 *                   axe checks part of it; a person still verifies the rest.
 * - `not-evaluated` no rule ran for it: axe-core's only rules are experimental or deprecated,
 *                   or need a tag the scan did not include. Nothing was checked.
 * - `manual`        axe-core has no rule for it. A person has to check it.
 *
 * "Runs in our scans" means the tag filter in `src/agent/axe-scan.ts`: a rule with a WCAG
 * level tag that is neither `experimental` nor `deprecated`. Verified against axe-core
 * 4.13.0 (target-size is off by default but runs under that filter; the other five rules
 * below do not). `wcag-coverage.test.ts` re-derives both tables from the installed axe-core,
 * so a rule axe adds, renames or retires fails the build instead of drifting.
 */
export type CoverageKind = "axe" | "not-evaluated" | "manual";

/** Rules that run in our scans, keyed by the catalog criterion they emit. */
export const AXE_RULES_BY_CRITERION: Readonly<Record<string, readonly string[]>> = {
  "1.1.1": ["aria-meter-name", "aria-progressbar-name", "image-alt", "input-image-alt", "object-alt", "role-img-alt", "svg-img-alt"],
  "1.2.2": ["video-caption"],
  "1.3.1": ["aria-hidden-body", "aria-required-children", "aria-required-parent", "definition-list", "dlitem", "list", "listitem", "td-headers-attr", "th-has-data-cells"],
  "1.3.5": ["autocomplete-valid"],
  "1.4.1": ["link-in-text-block"],
  "1.4.2": ["no-autoplay-audio"],
  "1.4.3": ["color-contrast"],
  "1.4.4": ["meta-viewport"],
  "1.4.12": ["avoid-inline-spacing"],
  "2.1.1": ["frame-focusable-content", "scrollable-region-focusable", "server-side-image-map"],
  "2.2.1": ["meta-refresh"],
  "2.2.2": ["blink", "marquee"],
  "2.4.1": ["bypass"],
  "2.4.2": ["document-title"],
  "2.4.4": ["area-alt", "link-name"],
  "2.5.8": ["target-size"],
  "3.1.1": ["html-has-lang", "html-lang-valid", "html-xml-lang-mismatch"],
  "3.1.2": ["valid-lang"],
  "3.3.2": ["form-field-multiple-labels"],
  "4.1.2": [
    "area-alt", "aria-allowed-attr", "aria-braille-equivalent", "aria-command-name", "aria-conditional-attr",
    "aria-deprecated-role", "aria-hidden-body", "aria-hidden-focus", "aria-input-field-name", "aria-prohibited-attr",
    "aria-required-attr", "aria-roles", "aria-tab-name", "aria-toggle-field-name", "aria-tooltip-name",
    "aria-valid-attr-value", "aria-valid-attr", "button-name", "duplicate-id-aria", "frame-title-unique",
    "frame-title", "input-button-name", "input-image-alt", "label", "link-name", "nested-interactive",
    "select-name", "summary-name",
  ],
};

/** Criteria whose only axe-core rules are experimental or deprecated, with those rules. */
export const AXE_UNRUN_RULES_BY_CRITERION: Readonly<Record<string, readonly string[]>> = {
  "1.2.1": ["audio-caption"],
  "1.3.4": ["css-orientation-lock"],
  "2.5.3": ["label-content-name-mismatch"],
};

/**
 * Rules that only run when a scan includes the WCAG 2.2 level tags (`wcag22a`/`wcag22aa`).
 * The hosted engine includes them; the SauceDemo probe behind the sample report used only
 * the 2.0/2.1 tags, so it never ran these.
 */
export const WCAG22_TAGGED_RULES: readonly string[] = ["target-size"];

export interface ScanOptions {
  /** Whether the scan's tag filter included the WCAG 2.2 level tags. */
  wcag22Rules: boolean;
}

const ENGINE_SCAN: ScanOptions = { wcag22Rules: true };

export interface CoverageEntry extends CatalogCriterion {
  kind: CoverageKind;
  /** The axe-core rules that bear on this criterion (empty for `manual`). */
  rules: readonly string[];
}

function runningRules(code: string, { wcag22Rules }: ScanOptions): readonly string[] {
  const rules = AXE_RULES_BY_CRITERION[code] ?? [];
  return wcag22Rules ? rules : rules.filter((r) => !WCAG22_TAGGED_RULES.includes(r));
}

export function coverageKind(code: string, scan: ScanOptions = ENGINE_SCAN): CoverageKind {
  if (runningRules(code, scan).length > 0) return "axe";
  if (code in AXE_RULES_BY_CRITERION || code in AXE_UNRUN_RULES_BY_CRITERION) return "not-evaluated";
  return "manual";
}

/** One entry per catalog criterion, in catalog order, for the hosted engine's scans. */
export const WCAG_COVERAGE: readonly CoverageEntry[] = WCAG22_AA_CATALOG.map((c) => ({
  ...c,
  kind: coverageKind(c.code),
  rules: AXE_RULES_BY_CRITERION[c.code] ?? AXE_UNRUN_RULES_BY_CRITERION[c.code] ?? [],
}));

/** SC codes at least one axe-core rule that runs in the given scan can emit. */
export function testedCodes(scan: ScanOptions = ENGINE_SCAN): ReadonlySet<string> {
  return new Set(WCAG22_AA_CATALOG.filter((c) => coverageKind(c.code, scan) === "axe").map((c) => c.code));
}

export const AXE_TESTED_CODES: ReadonlySet<string> = testedCodes();
