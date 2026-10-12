/**
 * Fence for attacker-controlled text that is shown to a model.
 *
 * Page content, and anything derived from it (browser error messages quote page
 * markup), is data, not instructions. Wrapping it in an explicit delimiter makes
 * "ignore previous instructions" read as data. To stop text breaking OUT of the
 * fence, every form of the delimiter tag inside it is neutralized first,
 * including spaced and attributed variants.
 */
// Bounded, unambiguous quantifiers keep matching linear on hostile input (CodeQL
// js/polynomial-redos). Any tag name left over (e.g. attributes longer than the bound)
// is renamed by the second pass, so no delimiter can survive inside the fence.
const FENCE_TAG = /<[\s/]{0,16}untrusted-page-content[^<>]{0,256}>/gi;
const FENCE_NAME = /untrusted-page-content/gi;

// The replacement shares no suffix of the delimiter name, so surrounding text cannot
// rejoin into it ("untrusted-" + "page-content..." would). Repeat until stable anyway.
const NAME_REPLACEMENT = "[fenced-name]";

export function neutralizeFenceTags(text: string): string {
  let out = text.replace(FENCE_TAG, "[page-content-tag]");
  for (let i = 0; i < 8 && FENCE_NAME.test(out); i++) {
    FENCE_NAME.lastIndex = 0;
    out = out.replace(FENCE_NAME, NAME_REPLACEMENT);
  }
  FENCE_NAME.lastIndex = 0;
  return out;
}

export function fenceUntrusted(text: string): string {
  return `<untrusted-page-content>\n${neutralizeFenceTags(text)}\n</untrusted-page-content>`;
}
