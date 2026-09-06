"use client";

import { useCallback, useState } from "react";

export function GradeBadgeEmbed({ token, host }: { token: string; host: string }) {
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<"md" | "html" | null>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://personaudit.com";

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
    <div className="space-y-4 rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Embed Scorecard Badge
        </h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          auto-updating · SVG
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Embed this verifiable accessibility grade on your GitHub README, documentation, or client website footer.
      </p>

      {/* Live Badge Preview */}
      <div className="flex items-center gap-4 rounded-sm border border-border bg-background px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">Preview:</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/grade/${token}/badge`}
          alt={`Accessibility grade preview for ${host}`}
          className="h-6 w-auto"
        />
      </div>

      {copyError && <p role="alert" className="text-sm text-destructive">{copyError}</p>}

      {/* Code Snippets & Copy Buttons */}
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">Markdown</span>
            <button
              type="button"
              onClick={() => copy(mdSnippet, "md")}
              className="font-mono text-[11px] text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
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
              className="font-mono text-[11px] text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              {copiedFormat === "html" ? "✓ Copied" : "Copy HTML"}
            </button>
          </div>
          <pre tabIndex={0} role="region" aria-label="HTML badge snippet" className="overflow-x-auto rounded-sm border border-border bg-background p-2.5 font-mono text-xs text-muted-foreground select-all">
            {htmlSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
