"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Personas", href: "/personas" },
];

export function AppNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <span className="text-lg font-semibold tracking-tight">MultiPersonas</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-b border-border bg-card p-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {userEmail && (
            <>
              <div className="mx-3 my-2 h-px bg-border" />
              <p className="truncate px-3 py-1 text-xs text-muted-foreground">{userEmail}</p>
              <button
                onClick={handleSignOut}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:text-primary">
            MultiPersonas
          </Link>
        </div>
        <div className="mx-3 h-px bg-border" />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {userEmail && (
          <div className="border-t border-border p-3">
            <p className="truncate px-3 py-1 text-xs text-muted-foreground">{userEmail}</p>
            <button
              onClick={handleSignOut}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
