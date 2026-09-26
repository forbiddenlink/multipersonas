import styles from "./content-prose.module.css";

export type ContentTocItem = { id: string; label: string; level?: 2 | 3 };

/**
 * The shared reading layout for docs, guides, and legal pages: an eyebrow + display
 * heading + dek, a "last reviewed" line, a sticky table of contents on wide screens
 * (plain anchors — works with JS disabled), and a 65ch serif reading column.
 *
 * Callers write plain semantic markup as children (`<h2 id="…">`, `<p>`, `<ul>`, a
 * `ContentCodeBlock`, a `ContentCallout`) — `.prose` in content-prose.module.css does
 * the typographic work, so no per-element classes are needed in the page itself.
 */
export function ContentArticle({
  eyebrow,
  title,
  dek,
  lastReviewed,
  toc,
  children,
}: {
  eyebrow: string;
  title: string;
  dek?: React.ReactNode;
  /** e.g. "26 September 2026" — rendered next to a "Last reviewed" label. */
  lastReviewed?: string;
  toc?: ContentTocItem[];
  children: React.ReactNode;
}) {
  const hasToc = Boolean(toc && toc.length > 0);
  return (
    <div className="frame section-y">
      <header className="max-w-[65ch]">
        <p className="label-mono">{eyebrow}</p>
        <h1 className="display mt-3 text-[clamp(2rem,4.4vw,3rem)] leading-[1.08]">{title}</h1>
        {dek ? (
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">{dek}</p>
        ) : null}
        {lastReviewed ? (
          <p className="mt-6 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
            Last reviewed <span className="text-foreground">{lastReviewed}</span>
          </p>
        ) : null}
      </header>

      <div className={hasToc ? "mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_14rem]" : "mt-12"}>
        <div className={styles.prose}>{children}</div>

        {hasToc ? (
          <aside className="hidden min-w-0 lg:block">
            <nav aria-label="On this page" className={styles.toc}>
              <p className="label-mono">On this page</p>
              <ul className="mt-3 space-y-0.5 border-l border-border pl-4 text-sm">
                {toc!.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                    <a href={`#${item.id}`} className={styles.tocLink}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
