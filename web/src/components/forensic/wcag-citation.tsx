"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { criterionName } from "@/lib/wcag";

// WCAG citation — `[WCAG 1.4.3]` that reveals the success-criterion name on hover OR
// focus (PreviewCard opens on both, so keyboard users get it too). Built on the existing
// @base-ui/react dependency; no new packages. Never fabricates a name — unknown codes
// show a neutral fallback.
export function WcagCitation({ code, className = "" }: { code: string; className?: string }) {
  const name = criterionName(code);
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        render={
          <button
            type="button"
            className={`rounded-sm font-mono text-xs tabular-nums text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${className}`}
          />
        }
      >
        [WCAG {code}]
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={8}>
          <PreviewCard.Popup className="max-w-[16rem] rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg shadow-black/20 transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <p className="font-mono text-xs tabular-nums text-[var(--primary)]">
              WCAG {code}
            </p>
            <p className="mt-0.5 font-serif leading-snug">
              {name ?? "Success criterion"}
            </p>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
