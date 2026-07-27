import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://multipersonas.dev"
  ),
  title: {
    default: "MultiPersonas — Accessibility scanning behind your login",
    template: "%s | MultiPersonas",
  },
  description: "Crawl your site with a saved session and run axe-core at every state — including checkout, dashboards, and authenticated flows a page-level scanner never reaches. Deterministic findings; credentials never leave your machine.",
  openGraph: {
    type: "website",
    siteName: "MultiPersonas",
  },
  twitter: {
    card: "summary_large_image",
  },
  other: {
    "theme-color": "#1a1a2e",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${dmSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground font-sans">
        {/* Dark-first, no-FOUC: apply the theme class before paint. Defaults to dark
            unless the user has explicitly chosen light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();",
          }}
        />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
