import Link from "next/link";

/**
 * Shown to free/anon-tier authed users where a Pro-only hosted persona audit would
 * otherwise render. The hosted audit (`/api/audit`) is Pro; a free user submitting the
 * real form only earns a 402, so present the boundary up front instead — point them at
 * the free axe grade and a no-Stripe "Request Pro" contact (docs/pro-access.md).
 */
export function ProAuditUpsell() {
  const supportHref = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
    ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Pro%20access`
    : "/waitlist";

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-[var(--primary)]">Pro</p>
      <p className="mt-2 text-lg font-semibold tracking-tight">
        The hosted persona audit is a Pro feature.
      </p>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Task-success personas walk a real-shaped user through your flows behind the login —
        the one thing a crawler can&apos;t measure. Free accounts get the deterministic
        axe-core grade: run one on any public URL, or request Pro to unlock hosted persona
        runs.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/grade"
          className="inline-flex items-center justify-center rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Run a free grade
        </Link>
        <a
          href={supportHref}
          className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Request Pro access
        </a>
      </div>
    </div>
  );
}
