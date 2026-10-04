import Link from "next/link";
import { HeaderActions } from "@/components/header-actions";
import { Wordmark } from "@/components/forensic/wordmark";
import { isFoundingCheckoutOpen } from "@/lib/founding-checkout";
import { headerCta, type HeaderIntent } from "@/lib/header-cta";

export type { HeaderIntent };

const NAV = [
  { href: "/for-agencies", label: "Agencies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "CLI docs" },
  { href: "/guides", label: "Guides" },
] as const;

const NAV_LINK =
  "rounded-sm px-2.5 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Marketing masthead. A thin file line above the nav names what the product is in
 * one breath; `intent` locks one primary job per surface so CTAs never compete.
 */
export function SiteHeader({ intent = "audit" }: { intent?: HeaderIntent } = {}) {
  const cta = headerCta(intent, intent === "waitlist" && isFoundingCheckoutOpen());

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[6px] supports-[backdrop-filter]:bg-background/85">
      <div className="frame flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
        >
          <Wordmark className="text-lg" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className={NAV_LINK}>
              {l.label}
            </Link>
          ))}
        </nav>

        <HeaderActions cta={cta} items={NAV} />
      </div>
    </header>
  );
}
