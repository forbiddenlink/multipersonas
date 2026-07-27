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
