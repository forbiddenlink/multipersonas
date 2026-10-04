export type HeaderIntent = "audit" | "waitlist" | "grade";

export type HeaderCta = { href: string; label: string; shortLabel: string };

/**
 * One primary header CTA per surface. On the agency page (intent "waitlist") the label
 * follows what the page body actually offers: a live checkout when founding access is
 * open, a waitlist when it is not. Both land on #early-access, so the header never
 * promises a different action than the primary button below it.
 */
export function headerCta(intent: HeaderIntent, foundingCheckoutOpen: boolean): HeaderCta {
  switch (intent) {
    case "waitlist":
      return foundingCheckoutOpen
        ? { href: "#early-access", label: "Start founding access", shortLabel: "Start access" }
        : { href: "#early-access", label: "Request founding access", shortLabel: "Request access" };
    case "grade":
      return { href: "/grade", label: "Grade a site free", shortLabel: "Grade a site" };
    default:
      return { href: "/#scan", label: "Grade a site free", shortLabel: "Grade a site" };
  }
}
