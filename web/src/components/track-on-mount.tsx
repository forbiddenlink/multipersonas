"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/analytics";

/** Fires one product event when the page mounts. Renders nothing. */
export function TrackOnMount({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackProductEvent(event, properties);
    // Once per mount by design; later prop changes must not re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
