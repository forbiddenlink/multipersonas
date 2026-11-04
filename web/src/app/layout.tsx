import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import { PALETTE, PALETTE_DARK } from "@/lib/og-palette";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";
import { siteOrigin } from "@/lib/site-url";
import { PLANS } from "@/lib/plans";

// Atkinson Hyperlegible Next: display, UI and body. The Braille Institute drew it so that
// similar characters (1 I l, 0 O) stay distinct. It is upright only here; the site has no
// italics. --font-sans and --font-serif both point at it, so every `font-serif` and
// `.display` use in the app picks it up without per-file edits.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin"],
  style: "normal",
  // next/font has no fallback metrics for this family yet, so it cannot size-match the
  // fallback. The font is preloaded; `swap` keeps text visible meanwhile.
  adjustFontFallback: false,
});

// Atkinson Hyperlegible Mono: the evidence face for rule IDs, WCAG codes, counts, commands.
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  style: "normal",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    siteOrigin()
  ),
  title: {
    default: "Personaudit: see where visitors get stuck on your site",
    template: "%s | Personaudit",
  },
  description: "AI personas browse your site toward a goal and show you where they got stuck, with the screenshot and their own words. A free axe-core accessibility grade backs it, and the free CLI scans behind a login locally (behind-login scanning runs locally with the CLI), so the password never leaves your machine. Not an overlay.",
  openGraph: {
    type: "website",
    siteName: "Personaudit",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Declaring both schemes stops native controls/scrollbars flashing the wrong theme, and
// the media-paired theme-color keeps the mobile address bar in sync with light/dark
// instead of pinning it to the dark value.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PALETTE.desk },
    { media: "(prefers-color-scheme: dark)", color: PALETTE_DARK.desk },
  ],
};

// Honest structured data: identity plus the published plan prices (same constants the
// pricing page and checkout use). No fabricated rating.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Personaudit",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web, macOS, Linux, Windows",
  url: siteOrigin(),
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Solo", price: String(PLANS.solo.monthlyUsd), priceCurrency: "USD" },
    { "@type": "Offer", name: "Agency", price: String(PLANS.founding.monthlyUsd), priceCurrency: "USD" },
  ],
  description:
    "An accessibility scanner: a free public grade from axe-core, and a local CLI that runs axe-core at every state a signed-in crawl reaches (behind-login scanning runs locally with the CLI, not on the hosted site). Automated findings, plus UX personas that measure task success. Not a disability simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${atkinsonMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="theme-transition min-h-dvh bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Paper-first, no-FOUC: apply the theme class before paint. Light unless the
            visitor chose dark, or has never chosen and their OS asks for dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
        {/* Scroll-reveal sections default to hidden and are revealed by JS. Without JS,
            force them visible so no-JS users never lose content (spec §8). */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
          Skip to main content
        </a>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
