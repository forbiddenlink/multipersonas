import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

// Enforce the narrowest policy that supports the application's configured integrations.
// Inline scripts remain necessary for the pre-paint theme choice and Next's runtime; move
// them to nonce-backed scripts before removing 'unsafe-inline'.
const isDev = process.env.NODE_ENV === "development";

// The browser signs in against NEXT_PUBLIC_SUPABASE_URL directly. Allow that exact origin so
// a local stack (http://127.0.0.1:54321) or a custom domain is not blocked by connect-src.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://us.i.posthog.com https://eu.i.posthog.com https://challenges.cloudflare.com`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  transpilePackages: ["personaudit"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Natural URL guesses land on the real auth routes instead of 404ing.
    return [
      { source: "/signup", destination: "/auth/signup", permanent: true },
      { source: "/login", destination: "/auth/login", permanent: true },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@engine": path.resolve(__dirname, "../src"),
    };
    // Resolve .js imports to .ts files (engine uses Node ESM .js extensions)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

// withSentryConfig COMPOSES the webpack fn above (it calls it, then appends the Sentry
// source-map plugin) rather than replacing it, so the @engine alias survives — verified by
// build. Source-map upload only runs when SENTRY_AUTH_TOKEN (+ SENTRY_ORG/SENTRY_PROJECT)
// are set in the build env; otherwise it is a no-op, so this ships safely without them.
// tunnelRoute proxies client events through our domain to beat ad-blockers.
export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
