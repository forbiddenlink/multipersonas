import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personaudit",
    short_name: "Personaudit",
    description:
      "Authenticated accessibility scanner — axe-core at every crawled state, plus UX personas for task success.",
    start_url: "/",
    display: "standalone",
    background_color: "#17130e",
    theme_color: "#17130e",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}
