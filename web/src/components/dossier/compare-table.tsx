import styles from "./content-prose.module.css";

export type CompareRow = { topic: string; them: React.ReactNode; us: React.ReactNode };

/**
 * Side-by-side table for the /compare pages. The wrapper scrolls at phone width, so it is
 * a focusable labelled region (keyboard users can scroll it).
 */
export function CompareTable({
  caption,
  themLabel,
  rows,
}: {
  caption: string;
  themLabel: string;
  rows: readonly CompareRow[];
}) {
  return (
    <div className={styles.tableScroll} role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">{themLabel}</th>
            <th scope="col">Personaudit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.topic}>
              <th scope="row" className="font-normal! normal-case! tracking-normal! text-foreground!">
                {r.topic}
              </th>
              <td>{r.them}</td>
              <td>{r.us}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
