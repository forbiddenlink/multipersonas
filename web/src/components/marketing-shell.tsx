import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shared chrome for marketing docs (guides, legal). Keeps header + footer
 * consistent so every public page has theme toggle, nav escape, and footer IA.
 */
export function MarketingShell({
  children,
  narrow = true,
  intent = "audit",
}: {
  children: React.ReactNode;
  /** Constrain main content to reading width (guides/legal). */
  narrow?: boolean;
  intent?: "audit" | "waitlist" | "grade";
}) {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent={intent} />
      <main
        id="main"
        className={
          narrow
            ? "mx-auto w-full max-w-2xl flex-1 px-6 section-y"
            : "w-full flex-1"
        }
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
