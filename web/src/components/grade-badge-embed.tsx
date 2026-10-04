"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const FALLBACK_ORIGIN = "https://personaudit.com";
const subscribeNoop = () => () => {};

export function GradeBadgeEmbed({ token, host }: { token: string; host: string }) {
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<"md" | "html" | null>(null);

  // Server and hydration renders use the fallback, then React re-renders with the real origin.
  // Reading window during render made the snippet text differ and threw hydration error 418.
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => FALLBACK_ORIGIN,
  );

  const badgeUrl = `${origin}/api/grade/${token}/badge`;
  const resultUrl = `${origin}/grade/${token}`;

  const mdSnippet = `[![Accessibility Grade for ${host}](${badgeUrl})](${resultUrl})`;
  const htmlSnippet = `<a href="${resultUrl}"><img src="${badgeUrl}" alt="Accessibility Grade for ${host}" /></a>`;

  const copy = useCallback(async (text: string, format: "md" | "html") => {
    setCopyError(null);
    setCopiedFormat(null);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1800);
    } catch {
      setCopyError("Could not copy. Select the snippet and copy it manually.");
    }
  }, []);

  return (
    <section className="border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="label-mono">Embed scorecard badge</h2>
        <span className="font-mono text-[11px] text-muted-foreground">SVG · cached up to 24 hours</span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Embed this verifiable accessibility grade on your GitHub README, documentation, or
        client website footer. The badge shows the grade from this scan. It does not
        change on its own: a re-grade makes a new result address, and the badge shows the
        new letter once you point it there. Browsers and CDNs can hold an old copy for up to
        a day.
      </p>

      {/* Live Badge Preview */}
      <div className="mt-4 flex items-center gap-4 rounded-sm border border-border bg-background px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">Preview:</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/grade/${token}/badge`}
          alt={`Accessibility grade preview for ${host}`}
          className="h-6 w-auto"
        />
      </div>

      {copyError && (
        <p role="alert" className="mt-3 text-sm text-[var(--redline)]">
          {copyError}
        </p>
      )}

      {/* Code Snippets & Copy Buttons */}
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">Markdown</span>
            <button
              type="button"
              onClick={() => copy(mdSnippet, "md")}
              className="inline-flex min-h-11 items-center px-2 font-mono text-[11px] text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              {copiedFormat === "md" ? "✓ Copied" : "Copy Markdown"}
            </button>
          </div>
          <pre tabIndex={0} role="region" aria-label="Markdown badge snippet" className="overflow-x-auto rounded-sm border border-border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
            {mdSnippet}
          </pre>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">HTML</span>
            <button
              type="button"
              onClick={() => copy(htmlSnippet, "html")}
              className="inline-flex min-h-11 items-center px-2 font-mono text-[11px] text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              {copiedFormat === "html" ? "✓ Copied" : "Copy HTML"}
            </button>
          </div>
          <pre tabIndex={0} role="region" aria-label="HTML badge snippet" className="overflow-x-auto rounded-sm border border-border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
            {htmlSnippet}
          </pre>
        </div>
      </div>
    </section>
  );
}
