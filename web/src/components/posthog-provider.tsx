"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { armBounceBeacon, claimOpeningPageview } from "@/lib/bounce-beacon";
import { afterLoadIdle } from "@/lib/idle";
import { capturePageview, getPosthog, scrubUrl } from "@/lib/posthog-client";

// The URL is read when the pageview is queued, not when posthog-js finishes loading, so a
// pageview that waits for the SDK still reports the page it was queued on.
function queuePageview(): void {
  const currentUrl = scrubUrl(window.location.href);
  void getPosthog().then((client) => {
    if (client) capturePageview(client, currentUrl);
  });
}

function PostHogPageview() {
  const pathname = usePathname();
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Opening pageview: wait for the page to finish loading so the SDK stays out of
      // first paint. Later navigations load it right away.
      const currentUrl = scrubUrl(window.location.href);
      // A visitor who leaves first is counted by the beacon. Whichever path claims the
      // opening pageview sends it, so it is never sent twice.
      const disarm = armBounceBeacon();
      afterLoadIdle(() => {
        void getPosthog().then((client) => {
          if (client && claimOpeningPageview()) capturePageview(client, currentUrl);
          disarm();
        });
      });
      return;
    }
    queuePageview();
  }, [pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageview />
      {children}
    </>
  );
}
