import type { Finding } from "./engine.js";

/**
 * Stable identity for an accessibility defect.
 *
 * A defect is "this rule, this element". The obvious key — rule id plus CSS
 * selector — breaks on any site built with a CSS-in-JS or component library,
 * because those generate a fresh id per render: `#mantine-u9fiwu7vi-target`
 * becomes `#mantine-0z3ehcal8-target` next time. The same element then looks
 * like a new defect on every scan.
 *
 * That corrupts two things at once:
 * - the product's own report, where one broken component appears as N defects
 *   across N states instead of one;
 * - any comparison between two runs, where nothing lines up.
 *
 * The run-4 experiment (2026-07-16) was measured with the naive key and its
 * number was unreliable for exactly this reason. This is the pre-registered fix.
 *
 * Approach: strip only *known* generator tokens, conservatively. Over-normalising
 * would merge genuinely distinct elements and undercount. The two-identical-crawls
 * self-check (experiments/personas-vs-crawler/self-check.ts) is the arbiter of
 * whether it strips enough: a correct key makes two identical crawls agree.
 */

interface Generator {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Framework-generated, per-render tokens. Each keeps its recognisable prefix so
 * distinct components stay distinct — only the random tail collapses.
 */
const GENERATORS: Generator[] = [
  // Mantine element ids: mantine-<base36>. Case-sensitive and lowercase-only on
  // purpose — Mantine's *stable* component classes are PascalCase
  // (mantine-Menu-item, mantine-Button-label), so requiring lowercase collapses
  // the random ids without touching the component names.
  { name: "mantine-id", pattern: /mantine-[a-z0-9]{6,}/g, replacement: "mantine-*" },
  // Mantine useId scope: __m__-r<id>  and React-Aria style __m__-…
  { name: "mantine-useid", pattern: /__m__-r?[a-z0-9]+/gi, replacement: "__m__-*" },
  // React useId: :r<base36>:  — appears raw and CSS-escaped (\:r5g\:)
  { name: "react-useid", pattern: /\\?:r[a-z0-9]+\\?:/gi, replacement: ":r*:" },
  // Emotion serialized class: emotion-<hash>, css-<hash>
  { name: "emotion", pattern: /\b(emotion|css)-[a-z0-9]+/gi, replacement: "$1-*" },
  // Radix / generic useId: radix-:r…: and radix-<hash>
  { name: "radix", pattern: /radix-[:a-z0-9]+/gi, replacement: "radix-*" },
  // Headless UI: headlessui-…-:r…: / headlessui-…-<n>
  { name: "headlessui", pattern: /headlessui-[a-z-]+-[:a-z0-9]+/gi, replacement: "headlessui-*" },
];

/** Collapse framework-generated tokens in a CSS selector to stable wildcards. */
export function normalizeSelector(selector: string): string {
  let out = selector;
  for (const g of GENERATORS) out = out.replace(g.pattern, g.replacement);
  return out;
}

/** The defect's stable identity: rule id + normalized element selector. */
export function defectKey(f: Partial<Pick<Finding, "ruleId" | "title" | "target" | "pageUrl">>): string {
  const rule = f.ruleId ?? f.title ?? "unknown";
  const element = f.target ? normalizeSelector(f.target) : (f.pageUrl ?? "");
  return `${rule}|${element}`;
}
