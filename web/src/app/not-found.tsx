import Link from "next/link";

// Terminal-native 404: a prompt line reporting no such route, with a `cd /` back home.
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-md border border-border bg-card font-mono text-sm">
        <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="select-none text-[var(--primary)]">┌─ </span>
          personaudit ~/404
        </div>
        <div className="space-y-3 px-4 py-5">
          <p className="text-foreground">
            <span aria-hidden="true" className="select-none text-[var(--primary)]">›&nbsp;</span>
            no such route — the page you&apos;re looking for doesn&apos;t exist
          </p>
          <Link
            href="/"
            className="inline-block rounded-sm border border-border px-3 py-1.5 transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <span aria-hidden="true" className="select-none text-[var(--primary)]">›&nbsp;</span>
            cd&nbsp;/ &nbsp;— back to Personaudit
          </Link>
        </div>
      </div>
    </main>
  );
}
