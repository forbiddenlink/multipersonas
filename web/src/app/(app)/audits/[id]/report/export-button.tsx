"use client";

import { Button } from "@/components/ui/button";

/** Triggers the browser's print dialog; users "Save as PDF" from there. No PDF library —
 * the print stylesheet in report.module.css renders the document, the browser makes the
 * file. See docs/superpowers/specs/2026-07-28-report-export-design.md.
 *
 * `secondary` variant, not `default` (bg-primary/teal): teal is demoted to active/live/
 * cursor state only in this design system, never a blanket CTA fill — see globals.css
 * token-system comment. Focus ring + keyboard activation come from the shared Button. */
export function ExportButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      Export PDF
    </Button>
  );
}
