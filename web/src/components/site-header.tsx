import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Personaudit
      </Link>
      <nav className="flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="sm:hidden">Try free</span>
              <span className="hidden sm:inline">Run free audit</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
