import Link from "next/link";

/**
 * Shown to free/anon-tier authed users where a Pro-only hosted persona audit would
 * otherwise render. The hosted audit (`/api/audit`) is Pro; a free user submitting the
 * real form only earns a 402, so present the boundary up front instead — point them at
 * the free axe grade and a no-Stripe "Request Pro" contact (docs/pro-access.md).
 *
 * HONESTY BOUNDARY (CONTEXT.md, ADR 0002): the hosted audit takes a URL only —
 * `/api/audit` accepts `{ url, personaIds, projectId }` and no credentials, and no
 * storageState handling exists anywhere in `web/`. This copy must never imply the
 * HOSTED product scans behind a login. Behind-login is CLI-only until the ADR 0001
 * pipeline ships. Selling the unbuilt capability here is worst of all, because this is
 * the surface someone reads while deciding to pay.
 */
export function ProAuditUpsell() {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-[var(--primary)]">Pro</p>
      <p className="mt-2 text-lg font-semibold tracking-tight">
        The hosted persona audit is a Pro feature.
      </p>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Task-success personas walk a real-shaped user through your public flows and report
        whether they actually finished the job. A crawler can&apos;t measure that. Free
        accounts get the deterministic axe-core grade on any public URL.
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Scanning behind a login runs in the CLI today, where your client&apos;s credentials
        never leave your machine. Hosted behind-login is what founding access funds. We
        won&apos;t sell it as shipped before it is.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/grade"
          className="inline-flex items-center justify-center rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Run a free grade
        </Link>
        <Link
          href="/for-agencies#early-access"
          className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          See founding access
        </Link>
      </div>
    </div>
  );
}
