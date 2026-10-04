"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

const NAV_LINK =
  "rounded-sm px-2.5 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const CTA_LINK =
  "inline-flex h-11 items-center whitespace-nowrap sm:h-9 rounded-sm bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

/**
 * The only auth-dependent part of the marketing header. It runs in the browser so the
 * server-rendered header carries no cookie read, which is what lets marketing pages
 * prerender. First paint is the signed-out state (the common visitor); a session in the
 * browser cookie swaps in Dashboard. This is a display toggle, not an access check:
 * every protected route still verifies the user on the server.
 */
export function HeaderActions({
  cta,
  items,
}: {
  cta: { href: string; label: string; shortLabel: string };
  items: readonly { href: string; label: string }[];
}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        if (!cancelled && data.session) setSignedIn(true);
      } catch {
        // Auth not configured or unreachable: the signed-out header is the safe default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <ThemeToggle />
      {signedIn ? (
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
      <MobileNav items={items} showSignIn={!signedIn} />
    </div>
  );
}
