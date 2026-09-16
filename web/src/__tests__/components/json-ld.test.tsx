import { describe, expect, it } from "vitest";
import { articleSchema } from "@/components/json-ld";

describe("articleSchema", () => {
  it("publishes the fields search engines need to validate a guide article", () => {
    expect(
      articleSchema({
        headline: "CI accessibility gate",
        description: "Gate new accessibility defects in CI.",
        path: "/guides/ci-accessibility-gate",
        datePublished: "2026-08-03",
        dateModified: "2026-08-18",
      }),
    ).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Article",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://personaudit.com/guides/ci-accessibility-gate",
      },
      image: "https://personaudit.com/opengraph-image",
      datePublished: expect.any(String),
      dateModified: expect.any(String),
      publisher: {
        "@type": "Organization",
        name: "Personaudit",
        logo: {
          "@type": "ImageObject",
          url: "https://personaudit.com/icon.svg",
        },
      },
    });
  });
});
