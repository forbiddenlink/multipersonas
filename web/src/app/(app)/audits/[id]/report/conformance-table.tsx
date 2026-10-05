import styles from "./report.module.css";
import type { ConformanceRow, ConformanceStatus } from "@/lib/conformance";

export type ConformanceMeta = Readonly<Record<ConformanceStatus, { label: string; color: string }>>;

/**
 * One row per WCAG success criterion. Every row renders, always: the report is a
 * handed-over document and print must show all of them. "Passes automated checks" with no
 * violations is the common case (axe found nothing, manual review still owed), so it is
 * set in a quiet neutral style and only rows that carry a measured failure keep a status
 * color. On phones the table restacks into one card per criterion (see report.module.css).
 */
export function ConformanceTable({ rows, meta }: { rows: readonly ConformanceRow[]; meta: ConformanceMeta }) {
  return (
    <table className={styles.table} data-stack tabIndex={0} aria-label="Conformance by criterion" role="table">
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader" style={{ width: "40%" }}>Success criterion</th>
          <th role="columnheader" style={{ width: "8%" }}>Level</th>
          <th role="columnheader" style={{ width: "22%" }}>Automated result</th>
          <th role="columnheader" style={{ width: "30%" }}>Remarks</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((row) => {
          const quiet = row.status === "passes-automated" && row.violationCount === 0;
          return (
            <tr key={row.code} role="row" className={quiet ? styles.quietRow : undefined}>
              <td role="cell" data-label="Criterion">
                <strong>{row.code}</strong> {row.name}
              </td>
              <td role="cell" data-label="Level">{row.level}</td>
              <td
                role="cell"
                data-label="Automated result"
                style={quiet ? undefined : { color: meta[row.status].color, whiteSpace: "nowrap" }}
              >
                {meta[row.status].label}
                {row.violationCount > 0 ? ` (${row.violationCount})` : ""}
              </td>
              <td role="cell" data-label="Remarks">{row.remarks}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
