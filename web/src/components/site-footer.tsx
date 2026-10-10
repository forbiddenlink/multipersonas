import Link from "next/link";
import { Wordmark } from "@/components/forensic/wordmark";

const FOOTER_LINK =
  "inline-flex min-h-11 items-center rounded-sm py-1 text-sm sm:min-h-0 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const GROUPS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/grade", label: "Free grade" },
      { href: "/sample-report", label: "Sample report" },
      { href: "/pricing", label: "Pricing" },
      { href: "/for-agencies", label: "For agencies" },
      { href: "/docs", label: "CLI docs" },
    ],
  },
  {
    title: "Field guides",
    links: [
      { href: "/guides/accessibility-deadlines", label: "2025–2028 deadlines" },
      { href: "/guides/ci-accessibility-gate", label: "CI accessibility gate" },
      { href: "/guides/wcag-checklist", label: "WCAG 2.2 checklist" },
      { href: "/guides/common-accessibility-issues", label: "Common issues" },
      { href: "/guides/screen-reader-testing", label: "Screen reader testing" },
    ],
  },
  {
    title: "The fine print",
    links: [
      { href: "/method", label: "Method" },
      { href: "/changelog", label: "Changelog" },
      { href: "/accessibility", label: "Accessibility statement" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "mailto:hello@personaudit.com", label: "hello@personaudit.com", external: true },
    ],
  },
];

/**
 * Colophon footer — what the product is, grouped links, and the standing disclosure
 * that separates deterministic findings from AI-written notes.
 */
export function SiteFooter({
  footnotes,
  className = "",
}: {
  footnotes?: React.ReactNode;
  className?: string;
}) {
  return (
    <footer className={`mt-auto border-t border-border bg-card ${className}`}>
      <div className="frame py-14">
        {footnotes ? <div className="mb-12 border-b border-border pb-10">{footnotes}</div> : null}
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          <div className="max-w-sm">
            <Wordmark className="text-lg text-foreground" />
            <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-muted-foreground">
              Accessibility evidence you can put in front of a client: axe-core at every state a
              crawl reaches, including behind the login with the CLI, run locally.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((g) => (
              <div key={g.title} className="min-w-0">
                <p className="label-mono">{g.title}</p>
                <ul className="mt-2 space-y-0 sm:mt-3 sm:space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      {l.external ? (
                        <a href={l.href} className={`${FOOTER_LINK} break-all`}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={FOOTER_LINK}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl leading-relaxed">
            Accessibility violations come from axe-core and are deterministic. Persona notes are
            written by AI, labeled as opinion, and should be checked by a person.
          </p>
          <p className="shrink-0 font-mono sm:text-right">
            <span className="bates block" aria-hidden="true">
              PA-0426 · End of file
            </span>
            Built by{" "}
            <a
              href="https://github.com/forbiddenlink"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link inline-flex min-h-11 items-center text-muted-foreground sm:min-h-0"
            >
              Elizabeth Stein
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
