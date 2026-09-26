import Link from "next/link";

// On-brand 404: a case file with no matching number. Dossier tokens only.
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="file-tab ml-5">
          <span>Case not found</span>
        </div>
        <div className="sheet margin-rule relative -mt-px pb-8 pl-12 pr-6 pt-7 sm:pl-14 sm:pr-8">
          <p className="label-mono">404</p>
          <h1 className="display mt-3 text-[clamp(1.6rem,3.6vw,2.1rem)] leading-[1.1]">
            No file under that number.
          </h1>
          <p className="mt-4 max-w-sm leading-relaxed text-muted-foreground">
            The page you&apos;re looking for isn&apos;t in the case file. It may have moved, or
            the link may be wrong.
          </p>
          <div className="mt-7 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:flex-wrap">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Back home
            </Link>
            <Link
              href="/grade"
              className="inline-flex h-10 items-center justify-center rounded-sm border border-border px-5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Grade a site free
            </Link>
            <Link
              href="/docs"
              className="text-link inline-flex h-10 items-center px-1 text-sm"
            >
              Read the CLI docs
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
