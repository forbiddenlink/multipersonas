import type { NextConfig } from "next";
import path from "path";

// Content-Security-Policy in REPORT-ONLY mode: it never blocks a request, it only
// reports violations, so it is safe to ship to the live site without risking the inline
// no-FOUC theme script (layout.tsx) or Next's inline runtime. Observe reports first, then
// tighten (drop 'unsafe-inline' via a nonce) and switch the header to the enforcing
// `Content-Security-Policy`. Wire a report-to/report-uri collector to capture violations.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
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
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
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

export default nextConfig;
