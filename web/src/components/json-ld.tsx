/**
 * Render a JSON-LD structured-data block. Server component — emits a single
 * <script type="application/ld+json"> with the given object. Kept tiny and typed loosely
 * because schema.org shapes vary per page (Article, FAQPage, ItemList, …).
 *
 * The payload is our own trusted, statically-authored data (never user input), so
 * JSON.stringify output is safe to inline; there is no user-controlled string to escape.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape `<` so a value can never close the <script> early, even though the payload is
  // our own static data. Standard hardening for inline JSON-LD.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** Build an Article schema for a guide page. */
export function articleSchema(input: {
  headline: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    author: { "@type": "Organization", name: "Personaudit" },
    publisher: { "@type": "Organization", name: "Personaudit" },
    mainEntityOfPage: input.path,
  };
}

/** FAQPage schema — answers must match the visible copy on the page. */
export function faqSchema(
  items: readonly { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
