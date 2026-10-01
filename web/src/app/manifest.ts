import type { MetadataRoute } from "next";
import { PALETTE } from "@/lib/og-palette";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personaudit",
    short_name: "Personaudit",
    description:
      "Authenticated accessibility scanner: axe-core at every crawled state, plus UX personas for task success.",
    start_url: "/",
    display: "standalone",
    background_color: PALETTE.desk,
    theme_color: PALETTE.desk,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
