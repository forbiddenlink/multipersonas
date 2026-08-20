"use client";

import { Button } from "@/components/ui/button";

export interface CsvVerdict {
  ruleId: string | null;
  title: string;
  severity: string;
  criteria: string[];
  locations: string[];
  recommendation: string;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: CsvVerdict[]) {
  const headers = ["Rule", "Title", "Severity", "WCAG SC", "Found at", "Recommendation"];
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.ruleId ?? "",
        row.title,
        row.severity,
        row.criteria.join("; "),
        row.locations.join("; "),
        row.recommendation,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Triggers the browser's print dialog; users "Save as PDF" from there. No PDF library —
 * the print stylesheet in report.module.css renders the document, the browser makes the
 * file. See docs/superpowers/specs/2026-07-28-report-export-design.md.
 *
 * `secondary` variant, not `default` (bg-primary/teal): teal is demoted to active/live/
 * cursor state only in this design system, never a blanket CTA fill — see globals.css
 * token-system comment. Focus ring + keyboard activation come from the shared Button. */
export function ExportButton({
  csvRows = [],
  filename = "personaudit-verdicts.csv",
}: {
  csvRows?: CsvVerdict[];
  filename?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={csvRows.length === 0}
        onClick={() => downloadCsv(filename, csvRows)}
      >
        Download CSV
      </Button>
    </div>
  );
}
