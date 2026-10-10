"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Read-only share URL with a copy button. The origin is read in the browser so the link
 * matches whichever host the owner is signed in on. */
export function CopyLinkField({ path }: { path: string }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="share-link-url">
        Share link
      </label>
      <input
        id="share-link-url"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 min-w-0 flex-1 rounded-sm border border-foreground/40 bg-card px-2 font-mono text-xs"
      />
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      <span className="sr-only" role="status">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
