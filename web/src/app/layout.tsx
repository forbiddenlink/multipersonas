import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

// Sans — copy, CTAs, UI, and tight headings.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Mono — the evidence face: logs, rule IDs, counts, meters, tool labels, host names.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Serif — the document voice: report verdict body, WCAG citations, guide prose.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://personaudit.com"
  ),
  title: {
    default: "Personaudit — accessibility scanning, plus a persona task-success layer",
    template: "%s | Personaudit",
  },
  description: "Scan a public URL with axe-core for deterministic accessibility violations, and run UX personas that browse toward a goal to measure whether a real-shaped user completes the flow. To scan behind your login, use the CLI — your credentials never leave your machine.",
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
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#17130e" },
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="theme-transition min-h-dvh bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Dark-first, no-FOUC: apply the theme class before paint. Defaults to dark
            unless the user has explicitly chosen light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();",
          }}
        />
        {/* Scroll-reveal sections default to hidden and are revealed by JS. Without JS,
            force them visible so no-JS users never lose content (spec §8). */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
          Skip to main content
        </a>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
