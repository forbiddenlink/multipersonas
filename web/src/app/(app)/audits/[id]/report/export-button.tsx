"use client";

import { Button } from "@/components/ui/button";

/** Triggers the browser's print dialog; users "Save as PDF" from there. No PDF library —
 * the print stylesheet in report.module.css renders the document, the browser makes the
 * file. See docs/superpowers/specs/2026-07-28-report-export-design.md. */
export function ExportButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Export PDF
    </Button>
  );
}
