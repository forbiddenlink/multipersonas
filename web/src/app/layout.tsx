import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { PALETTE, PALETTE_DARK } from "@/lib/og-palette";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

// Sans — UI, copy, CTAs. Plex reads as a technical document, not a SaaS default.
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Mono — the evidence face: rule IDs, file numbers, counts, stamps, commands.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Serif — display headings and the document voice (report body, guide prose).
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://personaudit.com"
  ),
  title: {
    default: "Personaudit: accessibility evidence behind the login",
    template: "%s | Personaudit",
  },
  description: "Personaudit runs axe-core at every state a signed-in crawl reaches (carts, checkouts, error screens) and turns it into a report an agency can hand a client. Free public grade, free CLI for behind-login scans. The password never leaves your machine. Not an overlay.",
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

// Honest structured data — identity only, no fabricated price/rating.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Personaudit",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web, macOS, Linux, Windows",
  url: "https://personaudit.com",
  description:
    "An authenticated accessibility scanner: axe-core at every crawled state (the compliance verdict), plus UX personas that measure task success. Not a disability simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable} antialiased`}
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
