import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personaudit",
    short_name: "Personaudit",
    description:
      "Authenticated accessibility scanner: axe-core at every crawled state, plus UX personas for task success.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4eb",
    theme_color: "#f8f4eb",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
