import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/forensic/wordmark";

export type HeaderIntent = "audit" | "waitlist" | "grade";

const CTA: Record<HeaderIntent, { href: string; label: string; shortLabel: string }> = {
  audit: { href: "/#scan", label: "Grade a site free", shortLabel: "Grade a site" },
  waitlist: { href: "#early-access", label: "Request founding access", shortLabel: "Request access" },
  grade: { href: "/grade", label: "Grade a site free", shortLabel: "Grade a site" },
};

const NAV = [
  { href: "/for-agencies", label: "Agencies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "CLI docs" },
  { href: "/guides/wcag-checklist", label: "Guides" },
] as const;

const NAV_LINK =
  "rounded-sm px-2.5 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const CTA_LINK =
  "inline-flex h-9 items-center whitespace-nowrap rounded-sm bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * Marketing masthead. A thin file line above the nav names what the product is in
 * one breath; `intent` locks one primary job per surface so CTAs never compete.
 */
export async function SiteHeader({ intent = "audit" }: { intent?: HeaderIntent } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cta = CTA[intent];

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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className={CTA_LINK}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className={`${NAV_LINK} hidden sm:inline-flex`}>
                Sign in
              </Link>
              <Link href={cta.href} className={CTA_LINK}>
                <span className="sm:hidden">{cta.shortLabel}</span>
                <span className="hidden sm:inline">{cta.label}</span>
              </Link>
            </>
          )}
          {/* Mobile menu — native disclosure, works without JS. */}
          <details className="group relative md:hidden">
            <summary
              className="flex size-9 cursor-pointer list-none items-center justify-center rounded-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" className="group-open:hidden" />
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" className="hidden group-open:block" />
              </svg>
            </summary>
            <nav
              aria-label="Mobile"
              className="sheet absolute right-0 top-[calc(100%+0.5rem)] z-50 flex w-56 flex-col p-2"
            >
              {NAV.map((l) => (
                <Link key={l.href} href={l.href} className={`${NAV_LINK} text-foreground`}>
                  {l.label}
                </Link>
              ))}
              {!user ? (
                <Link href="/auth/login" className={`${NAV_LINK} border-t border-border text-foreground`}>
                  Sign in
                </Link>
              ) : null}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
