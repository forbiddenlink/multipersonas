export type ProjectPrefill = { name: string; url: string };

/**
 * Converts a graded public URL into editable project defaults. Invalid query input is
 * discarded instead of being reflected into the form.
 */
export function projectPrefill(value: string | null): ProjectPrefill | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return {
      name: url.hostname.replace(/^www\./, ""),
      url: url.href,
    };
  } catch {
    return null;
  }
}
