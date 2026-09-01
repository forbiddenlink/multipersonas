"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackProductEvent } from "@/lib/analytics";

/**
 * The one link out of a finished grade and into the paid offer.
 *
 * A grade result is where someone has just been told, in writing, that the free
 * scan cannot see behind their login. That is the highest-intent moment the funnel
 * has, and until now it was the only step of it we could not measure. The event
 * names where the click came from so grade-to-offer can be read separately from
 * people who arrived at /for-agencies cold.
 */
export function GradeOfferLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/for-agencies"
      className={className}
      onClick={() => trackProductEvent("grade_offer_clicked", { from: "grade_result" })}
    >
      {children}
    </Link>
  );
}
