import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/forensic/wordmark";

export type HeaderIntent = "audit" | "waitlist" | "grade";

const CTA: Record<
  HeaderIntent,
  { href: string; label: string; shortLabel: string }
> = {
  audit: { href: "/#scan", label: "Run a free grade", shortLabel: "Free grade" },
  waitlist: { href: "#early-access", label: "Get early access", shortLabel: "Join" },
  grade: { href: "/grade", label: "Get my grade", shortLabel: "Grade" },
};

/**
 * Marketing header. `intent` locks one primary job per surface so CTAs don't compete
 * (home = audit, agencies = waitlist, grade = grade).
 */
export async function SiteHeader({
  intent = "audit",
}: {
  intent?: HeaderIntent;
} = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cta = CTA[intent];

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link
        href="/"
        className="rounded-sm text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <Wordmark className="text-lg text-foreground" />
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/for-agencies"
          className="hidden rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:inline"
        >
          For agencies
        </Link>
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-sm px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Sign in
            </Link>
            {intent !== "audit" ? (
              <Link
                href="/#scan"
                className="hidden rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:inline"
              >
                Free audit
              </Link>
            ) : null}
            <Link
              href={cta.href}
              className="rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <span className="sm:hidden">{cta.shortLabel}</span>
              <span className="hidden sm:inline">{cta.label}</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
