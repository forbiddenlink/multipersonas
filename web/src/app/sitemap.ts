import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://personaudit.com";

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/for-agencies`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/grade`, changeFrequency: "monthly", priority: 0.7 },
    // /auth/* is Disallow'd in robots.txt — keep it out of the sitemap too.
    { url: `${base}/guides/ci-accessibility-gate`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/guides/wcag-checklist`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides/common-accessibility-issues`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides/screen-reader-testing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/accessibility`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
