import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  serverExternalPackages: ["playwright", "@axe-core/playwright"],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@engine": path.resolve(__dirname, "../src"),
    };
    // Resolve .js imports to .ts files (engine uses Node ESM .js extensions)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    // Don't bundle Playwright — it runs as native Node module on server
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "playwright",
        "playwright-core",
        "@axe-core/playwright",
      ];
    }
    return config;
  },
};

export default nextConfig;
