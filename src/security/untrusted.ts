/**
 * Fence for attacker-controlled text that is shown to a model.
 *
 * Page content, and anything derived from it (browser error messages quote page
 * markup), is data, not instructions. Wrapping it in an explicit delimiter makes
 * "ignore previous instructions" read as data. To stop text breaking OUT of the
 * fence, every form of the delimiter tag inside it is neutralized first,
 * including spaced and attributed variants.
 */
const FENCE_TAG = /<\s*\/?\s*untrusted-page-content[^>]*>/gi;

export function neutralizeFenceTags(text: string): string {
  return text.replace(FENCE_TAG, "[page-content-tag]");
}

export function fenceUntrusted(text: string): string {
  return `<untrusted-page-content>\n${neutralizeFenceTags(text)}\n</untrusted-page-content>`;
}
